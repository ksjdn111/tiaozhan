'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Spin, Statistic, Row, Col, Empty, message, List, Tag } from 'antd'
import { LogoutOutlined, TrophyOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const API = 'http://localhost:5000/api'

export default function ProfilePage() {
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [badges, setBadges] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  useEffect(() => {
    const fetchData = async () => {
      const token = await getToken()
      const [statsRes, badgesRes, historyRes] = await Promise.all([
        fetch(`${API}/badges/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/badges/user`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/challenge/history?size=5`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const statsData = await statsRes.json()
      const badgesData = await badgesRes.json()
      const historyData = await historyRes.json()
      if (statsData.code === 0) setStats(statsData.data)
      if (badgesData.code === 0) setBadges(badgesData.data)
      if (historyData.code === 0) setHistory(historyData.data)
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>

  return (
    <div style={{ padding: 16 }}>
      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        {stats && (
          <Row gutter={16}>
            <Col span={8}><Statistic title="累计天数" value={stats.total_days} /></Col>
            <Col span={8}><Statistic title="完成挑战" value={stats.total_completed} /></Col>
            <Col span={8}><Statistic title="获得赞" value={stats.total_likes_received} /></Col>
          </Row>
        )}
      </Card>

      <Card title={<><TrophyOutlined /> 成就徽章</>} style={{ borderRadius: 12, marginTop: 12 }}>
        {badges.length === 0 ? <Empty description="还没有徽章，继续挑战吧！" /> : (
          <List
            dataSource={badges}
            renderItem={(item: any) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<span style={{ fontSize: 32 }}>{item.badge?.icon}</span>}
                  title={item.badge?.name}
                  description={item.badge?.description}
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <Card title="最近记录" style={{ borderRadius: 12, marginTop: 12 }}>
        {history.length === 0 ? <Empty description="还没有记录" /> : (
          <List
            dataSource={history}
            renderItem={(item: any) => (
              <List.Item>
                <List.Item.Meta
                  title={item.challenge?.title}
                  description={
                    <Tag color={item.status === 'done' ? 'green' : 'default'}>
                      {item.status === 'done' ? '已完成' : item.status === 'skipped' ? '已跳过' : '待完成'}
                    </Tag>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Button danger icon={<LogoutOutlined />} onClick={handleLogout}>退出登录</Button>
      </div>
    </div>
  )
}
