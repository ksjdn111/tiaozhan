'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Spin, Statistic, Row, Col, Empty, message, List, Tag, Modal, Input, Upload, Avatar, Badge } from 'antd'
import { LogoutOutlined, TrophyOutlined, EditOutlined, UserOutlined, PlusOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { UploadFile } from 'antd'

const API = '/api'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [badges, setBadges] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editing, setEditing] = useState(false)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || ''
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken()
        if (!token) { setError('未登录，请重新登录'); setLoading(false); return }

        const [profileRes, statsRes, badgesRes, historyRes] = await Promise.all([
          fetch(`${API}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/badges/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/badges/user`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/challenge/history?size=5`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const profileData = await profileRes.json()
        const statsData = await statsRes.json()
        const badgesData = await badgesRes.json()
        const historyData = await historyRes.json()

        if (profileData.code === 0) setProfile(profileData.data)
        if (statsData.code === 0) setStats(statsData.data)
        if (badgesData.code === 0) setBadges(badgesData.data)
        if (historyData.code === 0) setHistory(historyData.data)
        if (profileData.code !== 0) setError(profileData.message || '获取个人信息失败')
      } catch {
        setError('网络错误，请确认后端服务已启动')
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleEdit = () => {
    setEditUsername(profile?.username || '')
    setEditOpen(true)
  }

  const handleSaveUsername = async () => {
    if (!editUsername.trim()) { message.error('用户名不能为空'); return }
    if (editUsername.length < 3 || editUsername.length > 20) { message.error('用户名长度需 3-20 个字符'); return }

    setEditing(true)
    const token = await getToken()
    const res = await fetch(`${API}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: editUsername.trim() }),
    })
    const data = await res.json()
    if (data.code === 0) {
      setProfile({ ...profile, username: editUsername.trim() })
      message.success('用户名更新成功')
      setEditOpen(false)
    } else {
      message.error(data.message || '更新失败')
    }
    setEditing(false)
  }

  const handleAvatarUpload = async (file: File) => {
    const userId = await getUserId()
    const ext = file.name.split('.').pop()
    const filePath = `avatars/${userId}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) { message.error('头像上传失败'); return }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    const token = await getToken()
    await fetch(`${API}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar_url: publicUrl }),
    })

    setProfile({ ...profile, avatar_url: publicUrl })
    message.success('头像更新成功')
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  if (error) return <Empty description={error} style={{ paddingTop: 100 }} />

  return (
    <div style={{ padding: 16 }}>
      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <Upload
              showUploadList={false}
              beforeUpload={(file) => { handleAvatarUpload(file); return false }}
              accept="image/*"
            >
              <Avatar
                size={80}
                src={profile?.avatar_url}
                icon={<UserOutlined />}
                style={{ cursor: 'pointer' }}
              />
            </Upload>
            <div style={{ position: 'absolute', bottom: 0, right: 0, background: '#fff', borderRadius: '50%', padding: 2, cursor: 'pointer' }} onClick={handleEdit}>
              <EditOutlined style={{ color: '#409EFF', fontSize: 14 }} />
            </div>
          </div>
          <div style={{ marginTop: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{profile?.username || '未设置用户名'}</span>
            <Button type="link" size="small" icon={<EditOutlined />} onClick={handleEdit}>修改</Button>
          </div>
        </div>

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

      <Modal
        title="修改用户名"
        open={editOpen}
        onOk={handleSaveUsername}
        onCancel={() => setEditOpen(false)}
        confirmLoading={editing}
      >
        <Input
          value={editUsername}
          onChange={e => setEditUsername(e.target.value)}
          placeholder="请输入用户名"
          maxLength={20}
          showCount
        />
        <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>3-20 个字符，支持字母、数字、下划线和中文</p>
      </Modal>
    </div>
  )
}


