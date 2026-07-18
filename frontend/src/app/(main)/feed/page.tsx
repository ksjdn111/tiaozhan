'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Spin, Empty, Tag, message, Modal, Avatar } from 'antd'
import { HeartOutlined, HeartFilled, ThunderboltOutlined, MessageOutlined, UserAddOutlined, UserOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

const difficultyColors: Record<number, string> = { 1: '#52c41a', 2: '#13c2c2', 3: '#fa8c16', 4: '#f5222d', 5: '#722ed1' }
const categoryColors: Record<string, string> = { '运动': '#e6f7ff', '美食': '#fff7e6', '学习': '#f0f5ff', '创意': '#f9f0ff', '生活': '#e6fffb' }

export default function FeedPage() {
  const router = useRouter()
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [friendStatus, setFriendStatus] = useState('')

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || ''
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
          return { ...item, liked_by_me: data.liked, like_count: data.liked ? (item.like_count || 0) + 1 : (item.like_count || 0) - 1 }
        }
        return item
      }))
    }
  }

  const openUserProfile = async (userId: string) => {
    setUserLoading(true)
    setUserModalOpen(true)
    setFriendStatus('')
    const token = await getToken()
    const currentUserId = await getUserId()
    if (userId === currentUserId) {
      setFriendStatus('self')
    } else {
      const [profileRes, friendRes] = await Promise.all([
        fetch(`${API}/auth/public-profile/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/friends/check/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const pd = await profileRes.json()
      const fd = await friendRes.json()
      if (pd.code === 0) setUserProfile(pd.data)
      if (fd.code === 0) setFriendStatus(fd.data.status)
    }
    setUserLoading(false)
  }

  const handleAddFriend = async (targetId: string) => {
    const token = await getToken()
    const res = await fetch(`${API}/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ target_user_id: targetId })
    })
    const data = await res.json()
    if (data.code === 0) {
      message.success('好友请求已发送')
      setFriendStatus('pending')
    } else {
      message.error(data.message || '操作失败')
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => openUserProfile(item.user_id)}>
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
          <div style={{ cursor: 'pointer' }} onClick={() => router.push(`/feed/${item.id}`)}>
            <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{item.challenge?.title}</h4>
            {item.note && <p style={{ color: '#666', fontSize: 13, margin: '4px 0', lineHeight: 1.5 }}>{item.note}</p>}
            {item.photo_url && (
              <img src={item.photo_url} alt="challenge"
                style={{ width: '100%', borderRadius: 10, marginTop: 6, maxHeight: 240, objectFit: 'cover' }}
              />
            )}
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button type="text" icon={item.liked_by_me ? <HeartFilled style={{ color: '#ff4d4f' }} /> : <HeartOutlined />}
              onClick={() => toggleLike(item.id)} style={{ fontSize: 14 }}>
              <span style={{ marginLeft: 4 }}>{item.like_count || 0}</span>
            </Button>
            <Button type="text" icon={<MessageOutlined />}
              onClick={() => router.push(`/feed/${item.id}`)}
              style={{ fontSize: 14 }}>
              <span style={{ marginLeft: 4 }}>{item.comment_count || 0}</span>
            </Button>
          </div>
        </Card>
      ))}

      {/* User profile modal */}
      <Modal open={userModalOpen} onCancel={() => { setUserModalOpen(false); setUserProfile(null) }} footer={null}
        centered width={360}>
        {userLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
        ) : userProfile && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            {userProfile.avatar_url ? (
              <img src={userProfile.avatar_url} alt="avatar" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }} />
            ) : (
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 600, margin: '0 auto 8px' }}>
                {(userProfile.username || '?')[0]}
              </div>
            )}
            <h3 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 700 }}>{userProfile.username}</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 16px', minHeight: 20 }}>{userProfile.bio || '暂无简介'}</p>
            {friendStatus !== 'self' && (
              <Button type="primary" icon={<UserAddOutlined />}
                onClick={() => handleAddFriend(userProfile.id)}
                disabled={friendStatus === 'accepted' || friendStatus === 'pending'}
                style={{ borderRadius: 10, border: 'none' }}>
                {friendStatus === 'accepted' ? '已是好友' : friendStatus === 'pending' ? '已发送请求' : '添加好友'}
              </Button>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
