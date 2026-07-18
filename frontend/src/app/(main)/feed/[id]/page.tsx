'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, Button, Spin, Empty, Tag, message, Input, Divider, Avatar, Modal } from 'antd'
import { HeartOutlined, HeartFilled, ArrowLeftOutlined, SendOutlined, UserOutlined, UserAddOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

const difficultyColors: Record<number, string> = { 1: '#52c41a', 2: '#13c2c2', 3: '#fa8c16', 4: '#f5222d', 5: '#722ed1' }
const difficultyLabels: Record<number, string> = { 1: '简单', 2: '轻松', 3: '中等', 4: '困难', 5: '极限' }
const categoryIcons: Record<string, string> = { '运动': '🏃', '美食': '🍳', '学习': '📚', '创意': '🎨', '生活': '🏠' }
const categoryColors: Record<string, string> = { '运动': '#e6f7ff', '美食': '#fff7e6', '学习': '#f0f5ff', '创意': '#f9f0ff', '生活': '#e6fffb' }

export default function FeedDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [item, setItem] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [friendStatus, setFriendStatus] = useState('')
  const [friendLoading, setFriendLoading] = useState(false)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const fetchDetail = async () => {
    try {
      const token = await getToken()
      if (!token) { setError('未登录'); setLoading(false); return }
      const res = await fetch(`${API}/feed/detail/${params.id}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.code === 0) {
        setItem(data.data)
        setFriendStatus(data.data.is_friend ? 'accepted' : data.data.is_self ? 'self' : 'none')
      } else setError(data.message || '获取失败')
    } catch {
      setError('网络错误')
    }
    setLoading(false)
  }

  useEffect(() => { fetchDetail() }, [params.id])

  const handleAddFriend = async () => {
    setFriendLoading(true)
    const token = await getToken()
    const res = await fetch(`${API}/friends/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ target_user_id: item.user_id })
    })
    const data = await res.json()
    if (data.code === 0) {
      message.success('好友请求已发送')
      setFriendStatus('pending')
    } else {
      message.error(data.message || '操作失败')
    }
    setFriendLoading(false)
  }

  const toggleLike = async () => {
    const token = await getToken()
    const res = await fetch(`${API}/feed/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ daily_challenge_id: item.id })
    })
    const data = await res.json()
    if (data.code === 0) {
      setItem({
        ...item,
        liked_by_me: data.liked,
        like_count: data.liked ? item.like_count + 1 : item.like_count - 1
      })
    }
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    setCommentLoading(true)
    const token = await getToken()
    const res = await fetch(`${API}/feed/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ daily_challenge_id: item.id, content: commentText.trim() })
    })
    const data = await res.json()
    if (data.code === 0) {
      setCommentText('')
      fetchDetail()
    } else {
      message.error(data.message || '评论失败')
    }
    setCommentLoading(false)
  }

  if (loading) return <div style={{ padding: 16, textAlign: 'center', marginTop: 40 }}><Spin size="large" /></div>
  if (error) return <Empty description={error} style={{ paddingTop: 80 }} />
  if (!item) return <Empty description="不存在" style={{ paddingTop: 80 }} />

  const c = item.challenge

  return (
    <div style={{ padding: 16 }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()}
        style={{ marginBottom: 12, fontSize: 16 }}>返回</Button>

      {/* User info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        {item.profile?.avatar_url ? (
          <img src={item.profile.avatar_url} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 600 }}>
            {(item.profile?.username || '?')[0]}
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{item.profile?.username}</div>
          {item.profile?.bio && <div style={{ fontSize: 12, color: '#999' }}>{item.profile.bio}</div>}
        </div>
        {friendStatus !== 'self' && (
          <Button type={friendStatus === 'accepted' ? 'default' : 'primary'} size="small"
            icon={<UserAddOutlined />}
            style={{ borderRadius: 8, border: 'none' }}
            loading={friendLoading}
            disabled={friendStatus === 'accepted' || friendStatus === 'pending'}
            onClick={handleAddFriend}>
            {friendStatus === 'accepted' ? '已好友' : friendStatus === 'pending' ? '已请求' : '添加好友'}
          </Button>
        )}
      </div>

      <Divider style={{ margin: '8px 0' }} />

      {/* Challenge card */}
      <Card style={{ borderRadius: 14, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: categoryColors[c?.category] || '#f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0,
          }}>
            {categoryIcons[c?.category] || '🎯'}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{c?.title}</h2>
            <p style={{ color: '#666', fontSize: 13, margin: '4px 0', lineHeight: 1.6 }}>{c?.description}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              <Tag color={difficultyColors[c?.difficulty]}>{difficultyLabels[c?.difficulty]}</Tag>
              <Tag style={{ background: categoryColors[c?.category] || '#f0f0f0', border: 'none' }}>{c?.category}</Tag>
            </div>
          </div>
        </div>

        {item.note && (
          <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '10px 14px', margin: '8px 0' }}>
            <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.6 }}>{item.note}</p>
          </div>
        )}
        {item.photo_url && (
          <img src={item.photo_url} alt="proof" style={{ width: '100%', borderRadius: 10, marginTop: 6, maxHeight: 320, objectFit: 'cover' }} />
        )}
      </Card>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '12px 0', padding: '0 4px' }}>
        <Button type="text" size="large"
          icon={item.liked_by_me ? <HeartFilled style={{ color: '#ff4d4f', fontSize: 20 }} /> : <HeartOutlined style={{ fontSize: 20 }} />}
          onClick={toggleLike}>
          <span style={{ fontSize: 15, marginLeft: 4 }}>{item.like_count || 0}</span>
        </Button>
        <span style={{ color: '#999', fontSize: 13 }}><ClockCircleOutlined /> {item.date}</span>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Comments */}
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>
        评论 <span style={{ color: '#999', fontWeight: 400 }}>({item.comments?.length || 0})</span>
      </h3>

      <div style={{ maxHeight: 360, overflow: 'auto', marginBottom: 12 }}>
        {(!item.comments || item.comments.length === 0) ? (
          <p style={{ color: '#ccc', fontSize: 13, textAlign: 'center', margin: '24px 0' }}>暂无评论，来第一个评论吧</p>
        ) : (
          item.comments.map((c: any) => (
            <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
              {c.profile?.avatar_url ? (
                <img src={c.profile.avatar_url} alt="avatar" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 2 }} />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
                  {(c.profile?.username || '?')[0]}
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{c.profile?.username}</div>
                <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, marginTop: 2 }}>{c.content}</div>
                <div style={{ fontSize: 11, color: '#bbb', marginTop: 2 }}>
                  {new Date(c.created_at).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment input */}
      <div style={{ display: 'flex', gap: 8, position: 'sticky', bottom: 0, background: '#f5f7fa', padding: '8px 0' }}>
        <Input value={commentText} onChange={e => setCommentText(e.target.value)}
          placeholder="写下你的评论..." maxLength={500}
          style={{ borderRadius: 10, flex: 1 }}
          onPressEnter={handleComment}
        />
        <Button type="primary" icon={<SendOutlined />} loading={commentLoading}
          onClick={handleComment} style={{ borderRadius: 10, border: 'none' }}>发送</Button>
      </div>
    </div>
  )
}
