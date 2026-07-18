'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Spin, Empty, Tag, message } from 'antd'
import { HeartOutlined, HeartFilled, ThunderboltOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

const difficultyColors: Record<number, string> = { 1: '#52c41a', 2: '#13c2c2', 3: '#fa8c16', 4: '#f5222d', 5: '#722ed1' }
const difficultyLabels: Record<number, string> = { 1: '简单', 2: '轻松', 3: '中等', 4: '困难', 5: '极限' }

export default function FeedPage() {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const fetchFeed = async () => {
    try {
      const token = await getToken()
      if (!token) { setError('未登录，请重新登录'); setLoading(false); return }
      const res = await fetch(`${API}/feed/list`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.code === 0) { setFeed(data.data); setError('') }
      else { setError(data.message || '获取动态失败') }
    } catch {
      setError('网络错误，请确认后端服务已启动')
    }
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

  if (loading) return (
    <div style={{ padding: 16 }}>
      <div className="skeleton" style={{ height: 24, width: '30%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 120, marginBottom: 12, borderRadius: 14 }} />
      <div className="skeleton" style={{ height: 120, borderRadius: 14 }} />
    </div>
  )
  if (error) return <Empty description={error} style={{ paddingTop: 80 }} />
  if (feed.length === 0) return (
    <div style={{ textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
      <p style={{ color: '#999' }}>暂无动态</p>
      <p style={{ color: '#ccc', fontSize: 13 }}>去完成挑战，和大家分享吧！</p>
    </div>
  )

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <ThunderboltOutlined style={{ fontSize: 22, color: '#667eea' }} />
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>挑战广场</h2>
      </div>
      {feed.map(item => (
        <Card key={item.id} style={{
          borderRadius: 14, marginBottom: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          border: 'none',
        }} size="small" className="hover-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {item.profile?.avatar_url ? (
                <img src={item.profile.avatar_url} alt="avatar"
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 14, fontWeight: 600,
                }}>
                  {(item.profile?.username || '?')[0]}
                </div>
              )}
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {item.profile?.username || '匿名用户'}
              </span>
            </div>
            <Tag color={difficultyColors[item.challenge?.difficulty] || 'default'} style={{ borderRadius: 6 }}>
              {item.challenge?.category}
            </Tag>
          </div>
          <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{item.challenge?.title}</h4>
          {item.note && <p style={{ color: '#666', fontSize: 13, margin: '4px 0', lineHeight: 1.5 }}>{item.note}</p>}
          {item.photo_url && (
            <img src={item.photo_url} alt="challenge"
              style={{ width: '100%', borderRadius: 10, marginTop: 6, maxHeight: 240, objectFit: 'cover' }}
            />
          )}
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={item.liked_by_me
                ? <HeartFilled style={{ color: '#ff4d4f' }} />
                : <HeartOutlined />}
              onClick={() => toggleLike(item.id)}
              style={{ fontSize: 14 }}
            >
              <span style={{ marginLeft: 4 }}>{item.like_count || 0}</span>
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}
