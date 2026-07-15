'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Spin, Empty, Tag, message } from 'antd'
import { HeartOutlined, HeartFilled } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = 'http://localhost:5000/api'

const difficultyColors: Record<number, string> = { 1: 'green', 2: 'cyan', 3: 'orange', 4: 'red', 5: 'purple' }

export default function FeedPage() {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const fetchFeed = async () => {
    const token = await getToken()
    const res = await fetch(`${API}/feed/list`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.code === 0) setFeed(data.data)
    setLoading(false)
  }

  useEffect(() => { fetchFeed() }, [])

  const toggleLike = async (dcId: number) => {
    const token = await getToken()
    const res = await fetch(`${API}/feed/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ daily_challenge_id: dcId })
    })
    const data = await res.json()
    if (data.code === 0) {
      setFeed(feed.map(item => {
        if (item.id === dcId) {
          return {
            ...item,
            liked_by_me: data.liked,
            like_count: data.liked ? (item.like_count || 0) + 1 : (item.like_count || 0) - 1
          }
        }
        return item
      }))
    }
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  if (feed.length === 0) return <Empty description="暂无动态" style={{ paddingTop: 100 }} />

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginBottom: 16 }}>挑战广场</h2>
      {feed.map(item => (
        <Card key={item.id} style={{ borderRadius: 12, marginBottom: 12 }} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>
              {item.profile?.username || '匿名用户'}
            </span>
            <Tag color={difficultyColors[item.challenge?.difficulty] || 'default'}>
              {item.challenge?.category}
            </Tag>
          </div>
          <h4>{item.challenge?.title}</h4>
          {item.note && <p style={{ color: '#666', fontSize: 13 }}>{item.note}</p>}
          {item.photo_url && (
            <img src={item.photo_url} alt="challenge" style={{ width: '100%', borderRadius: 8, marginTop: 8 }} />
          )}
          <div style={{ marginTop: 8 }}>
            <Button
              type="text"
              icon={item.liked_by_me ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              onClick={() => toggleLike(item.id)}
            >
              {item.like_count || 0}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
