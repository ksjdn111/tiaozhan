'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Spin, Empty, Tag, message, Modal, Input, Avatar, List, Divider, Tooltip } from 'antd'
import { HeartOutlined, HeartFilled, ThunderboltOutlined, MessageOutlined, UserOutlined, ClockCircleOutlined, SendOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

const difficultyColors: Record<number, string> = { 1: '#52c41a', 2: '#13c2c2', 3: '#fa8c16', 4: '#f5222d', 5: '#722ed1' }
const difficultyLabels: Record<number, string> = { 1: '简单', 2: '轻松', 3: '中等', 4: '困难', 5: '极限' }
const categoryIcons: Record<string, string> = { '运动': '🏃', '美食': '🍳', '学习': '📚', '创意': '🎨', '生活': '🏠' }
const categoryColors: Record<string, string> = { '运动': '#e6f7ff', '美食': '#fff7e6', '学习': '#f0f5ff', '创意': '#f9f0ff', '生活': '#e6fffb' }

export default function FeedPage() {
  const [feed, setFeed] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState<any>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [userLoading, setUserLoading] = useState(false)

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
          return { ...item, liked_by_me: data.liked, like_count: data.liked ? (item.like_count || 0) + 1 : (item.like_count || 0) - 1 }
        }
        return item
      }))
      if (detailItem && detailItem.id === dcId) {
        setDetailItem({ ...detailItem, liked_by_me: data.liked, like_count: data.liked ? (detailItem.like_count || 0) + 1 : (detailItem.like_count || 0) - 1 })
      }
    }
  }

  const openDetail = async (dcId: number) => {
    setDetailLoading(true)
    setDetailOpen(true)
    const token = await getToken()
    const res = await fetch(`${API}/feed/detail/${dcId}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.code === 0) setDetailItem(data.data)
    else message.error(data.message || '获取详情失败')
    setDetailLoading(false)
  }

  const handleComment = async () => {
    if (!commentText.trim()) return
    setCommentLoading(true)
    const token = await getToken()
    const res = await fetch(`${API}/feed/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ daily_challenge_id: detailItem.id, content: commentText.trim() })
    })
    const data = await res.json()
    if (data.code === 0) {
      message.success('评论成功')
      setCommentText('')
      const detailRes = await fetch(`${API}/feed/detail/${detailItem.id}`, { headers: { Authorization: `Bearer ${token}` } })
      const detailData = await detailRes.json()
      if (detailData.code === 0) setDetailItem(detailData.data)
    } else {
      message.error(data.message || '评论失败')
    }
    setCommentLoading(false)
  }

  const openUserProfile = async (userId: string) => {
    setUserLoading(true)
    setUserModalOpen(true)
    const token = await getToken()
    const res = await fetch(`${API}/auth/public-profile/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.code === 0) setUserProfile(data.data)
    else message.error(data.message || '获取用户信息失败')
    setUserLoading(false)
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
          <div style={{ cursor: 'pointer' }} onClick={() => openDetail(item.id)}>
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
            <Button type="text" icon={<MessageOutlined />} onClick={() => openDetail(item.id)} style={{ fontSize: 14 }}>
              评论
            </Button>
          </div>
        </Card>
      ))}

      {/* Detail modal */}
      <Modal open={detailOpen} onCancel={() => { setDetailOpen(false); setDetailItem(null) }} footer={null}
        width={520} centered style={{ top: 20 }}>
        {detailLoading ? (
          <div style={{ padding: 32, textAlign: 'center' }}><Spin /></div>
        ) : detailItem && (
          <div>
            {/* User info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, cursor: 'pointer' }}
              onClick={() => { setDetailOpen(false); openUserProfile(detailItem.user_id) }}>
              {detailItem.profile?.avatar_url ? (
                <img src={detailItem.profile.avatar_url} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 600 }}>
                  {(detailItem.profile?.username || '?')[0]}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{detailItem.profile?.username}</div>
                {detailItem.profile?.bio && <div style={{ fontSize: 12, color: '#999' }}>{detailItem.profile.bio}</div>}
              </div>
            </div>
            <Divider style={{ margin: '8px 0' }} />
            {/* Challenge */}
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: categoryColors[detailItem.challenge?.category] || '#f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
              }}>
                {categoryIcons[detailItem.challenge?.category] || '🎯'}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{detailItem.challenge?.title}</h3>
                <p style={{ color: '#666', fontSize: 13, margin: '4px 0' }}>{detailItem.challenge?.description}</p>
                <Tag color={difficultyColors[detailItem.challenge?.difficulty]}>{difficultyLabels[detailItem.challenge?.difficulty]}</Tag>
                <Tag style={{ background: categoryColors[detailItem.challenge?.category] || '#f0f0f0', border: 'none' }}>{detailItem.challenge?.category}</Tag>
              </div>
            </div>
            {detailItem.note && (
              <div style={{ background: '#f9f9f9', borderRadius: 10, padding: '10px 14px', margin: '8px 0' }}>
                <p style={{ margin: 0, fontSize: 13, color: '#555', lineHeight: 1.6 }}>{detailItem.note}</p>
              </div>
            )}
            {detailItem.photo_url && (
              <img src={detailItem.photo_url} alt="proof" style={{ width: '100%', borderRadius: 10, marginTop: 6, maxHeight: 300, objectFit: 'cover' }} />
            )}
            <Divider style={{ margin: '12px 0' }} />
            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <Button type="text" size="large"
                icon={detailItem.liked_by_me ? <HeartFilled style={{ color: '#ff4d4f', fontSize: 18 }} /> : <HeartOutlined style={{ fontSize: 18 }} />}
                onClick={() => toggleLike(detailItem.id)}>
                {detailItem.like_count || 0}
              </Button>
              <span style={{ color: '#999', fontSize: 13 }}><ClockCircleOutlined /> {detailItem.date}</span>
            </div>
            {/* Comments */}
            <div style={{ background: '#fafafa', borderRadius: 10, padding: 12, marginBottom: 12, maxHeight: 240, overflow: 'auto' }}>
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, color: '#666' }}>评论 ({detailItem.comments?.length || 0})</div>
              {(!detailItem.comments || detailItem.comments.length === 0) ? (
                <p style={{ color: '#ccc', fontSize: 13, textAlign: 'center', margin: '12px 0' }}>暂无评论</p>
              ) : (
                detailItem.comments.map((c: any) => (
                  <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    {c.profile?.avatar_url ? (
                      <img src={c.profile.avatar_url} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, marginTop: 2 }} />
                    ) : (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#667eea', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                        {(c.profile?.username || '?')[0]}
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{c.profile?.username}</div>
                      <div style={{ fontSize: 13, color: '#333', lineHeight: 1.5 }}>{c.content}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {/* Comment input */}
            <div style={{ display: 'flex', gap: 8 }}>
              <Input value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="写下你的评论..." maxLength={500}
                style={{ borderRadius: 10, flex: 1 }}
                onPressEnter={handleComment}
              />
              <Button type="primary" icon={<SendOutlined />} loading={commentLoading}
                onClick={handleComment} style={{ borderRadius: 10 }}>发送</Button>
            </div>
          </div>
        )}
      </Modal>

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
            <p style={{ color: '#888', fontSize: 13, margin: 0, minHeight: 20 }}>{userProfile.bio || '暂无简介'}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}
