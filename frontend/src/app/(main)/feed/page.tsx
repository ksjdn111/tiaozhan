'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Button, Spin, Empty, Tag, message, Modal, Avatar, Divider, Input, Upload, Image } from 'antd'
import { HeartOutlined, HeartFilled, ThunderboltOutlined, MessageOutlined, UserAddOutlined, UserOutlined, DeleteOutlined, PlusOutlined, CloseCircleOutlined, ZoomInOutlined } from '@ant-design/icons'
import { getToken, getUserId } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { API } from '@/lib/api'

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
  const [userBadges, setUserBadges] = useState<any[]>([])
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [postNote, setPostNote] = useState('')
  const [searchText, setSearchText] = useState('')
  const [postPhotos, setPostPhotos] = useState<File[]>([])
  const [postPhotoPreviews, setPostPhotoPreviews] = useState<string[]>([])
  const [posting, setPosting] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState('')

  const [currentUserId, setCurrentUserId] = useState('')

  useEffect(() => { getToken().then(t => { if (!t) router.replace('/login') }); getUserId().then(id => { if (id) setCurrentUserId(id) }) }, [])

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
    setUserBadges([])
    const token = await getToken()
    const currentUserId = await getUserId()
    const fetches: any[] = [
      fetch(`${API}/auth/public-profile/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API}/badges/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } }),
    ]
    if (userId !== currentUserId) {
      fetches.push(fetch(`${API}/friends/check/${userId}`, { headers: { Authorization: `Bearer ${token}` } }))
    } else {
      setFriendStatus('self')
    }
    const [profileRes, badgesRes, friendRes] = await Promise.all(fetches)
    const pd = await profileRes.json()
    const bd = await badgesRes.json()
    if (pd.code === 0) setUserProfile(pd.data)
    if (bd.code === 0) setUserBadges(bd.data)
    if (friendRes) {
      const fd = await friendRes.json()
      if (fd.code === 0) setFriendStatus(fd.data.status)
    }
    setUserLoading(false)
  }

  const handleCreatePost = async () => {
    if (!postNote.trim()) { message.error('请输入内容'); return }
    setPosting(true)
    const token = await getToken()
    const userId = await getUserId()
    const photoUrls: string[] = []
    for (const file of postPhotos) {
      const ext = file.name.split('.').pop()
      const path = `feed/${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('proofs').upload(path, file, { upsert: true })
      if (uploadErr) { message.error('图片上传失败'); setPosting(false); return }
      const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(path)
      photoUrls.push(publicUrl)
    }
    const note = JSON.stringify({ custom: true, title: '分享动态', description: postNote.trim(), user_note: postNote.trim() })
    const res = await fetch(`${API}/feed/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ note, photo_url: photoUrls.length > 0 ? JSON.stringify(photoUrls) : '' }),
    })
    const data = await res.json()
    if (data.code === 0) { message.success('发布成功'); setPostModalOpen(false); setPostNote(''); setPostPhotos([]); setPostPhotoPreviews([]); fetchFeed() }
    else message.error(data.message || '发布失败')
    setPosting(false)
  }

  const handleDeletePost = async (dcId: number) => {
    Modal.confirm({ title: '确认删除', content: '删除后无法恢复，确定要删除吗？', okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        const token = await getToken()
        const res = await fetch(`${API}/feed/delete-post/${dcId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.code === 0) { message.success('已删除'); setFeed(feed.filter(i => i.id !== dcId)) }
        else message.error(data.message || '删除失败')
      }
    })
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
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, flex: 1 }}>挑战广场</h2>
        <Input.Search placeholder="搜索帖子..." value={searchText} onChange={e => setSearchText(e.target.value)} style={{ width: 160 }} size="small" />
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setPostModalOpen(true)}
          style={{ borderRadius: 10, border: 'none', height: 36 }} size="small">发布</Button>
      </div>
      {(searchText ? feed.filter(item =>
        (item.profile?.username || '').includes(searchText) ||
        (item.challenge?.title || '').includes(searchText) ||
        ((item._is_custom ? item._user_note : item.note) || '').includes(searchText)
      ) : feed).map(item => (
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {currentUserId === item.user_id && (
                <Button type="text" size="small" icon={<DeleteOutlined />} danger
                  onClick={(e) => { e.stopPropagation(); handleDeletePost(item.id) }} />
              )}
              <Tag color={difficultyColors[item.challenge?.difficulty] || 'default'} style={{ borderRadius: 6 }}>
                {item.challenge?.category}
              </Tag>
            </div>
          </div>
          <div style={{ cursor: 'pointer' }} onClick={() => router.push(`/feed/${item.id}`)}>
            <h4 style={{ margin: '0 0 4px', fontSize: 15 }}>{item.challenge?.title}</h4>
            {(item._is_custom ? item._user_note : item.note) && <p style={{ color: '#666', fontSize: 13, margin: '4px 0', lineHeight: 1.5 }}>{item._is_custom ? item._user_note : item.note}</p>}
            {(() => {
              const urls: string[] = (() => { try { const p = JSON.parse(item.photo_url); return Array.isArray(p) ? p : [item.photo_url] } catch { return item.photo_url ? [item.photo_url] : [] } })()
              return urls.length > 0 && <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {urls.map((url, i) => (
                  <img key={i} src={url} alt="challenge" style={{ width: urls.length > 1 ? 'calc(33.33% - 4px)' : '100%', borderRadius: 10, maxHeight: 240, objectFit: 'cover', cursor: 'pointer' }}
                    onClick={(e) => { e.stopPropagation(); setLightboxUrl(url) }} />
                ))}
              </div>
            })()}
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

      {/* Create post modal */}
      <Modal title="发布动态" open={postModalOpen} onCancel={() => { setPostModalOpen(false); setPostNote(''); setPostPhotos([]); setPostPhotoPreviews([]) }}
        onOk={handleCreatePost} confirmLoading={posting} okText="发布" centered>
        <Input.TextArea value={postNote} onChange={e => setPostNote(e.target.value)} placeholder="说说你在做什么..." rows={4} maxLength={500} showCount style={{ borderRadius: 10, marginBottom: 12 }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {postPhotoPreviews.map((preview, i) => (
            <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
              <img src={preview} alt="preview" style={{ width: 72, height: 72, borderRadius: 8, objectFit: 'cover' }} />
              <CloseCircleOutlined style={{ position: 'absolute', top: -4, right: -4, fontSize: 16, color: '#ff4d4f', cursor: 'pointer' }}
                onClick={() => { const newFiles = [...postPhotos]; newFiles.splice(i, 1); setPostPhotos(newFiles); const newPreviews = [...postPhotoPreviews]; newPreviews.splice(i, 1); setPostPhotoPreviews(newPreviews) }} />
            </div>
          ))}
          {postPhotos.length < 3 && (
            <Upload showUploadList={false} beforeUpload={(f) => { setPostPhotos([...postPhotos, f]); setPostPhotoPreviews([...postPhotoPreviews, URL.createObjectURL(f)]); return false }} accept="image/*">
              <div style={{ width: 72, height: 72, borderRadius: 8, border: '1px dashed #d9d9d9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <PlusOutlined style={{ fontSize: 20, color: '#999' }} />
              </div>
            </Upload>
          )}
        </div>
      </Modal>

      {/* Image lightbox */}
      <Modal open={!!lightboxUrl} onCancel={() => setLightboxUrl('')} footer={null} centered width="90vw">
        {lightboxUrl && <img src={lightboxUrl} alt="preview" style={{ width: '100%', borderRadius: 8 }} />}
      </Modal>

      {/* User profile modal */}
      <Modal open={userModalOpen} onCancel={() => { setUserModalOpen(false); setUserProfile(null); setUserBadges([]) }} footer={null}
        centered width={380}>
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
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 12px', minHeight: 20 }}>{userProfile.bio || '暂无简介'}</p>
            {friendStatus !== 'self' && (
              <Button type="primary" size="small" icon={<UserAddOutlined />}
                onClick={() => handleAddFriend(userProfile.id)}
                disabled={friendStatus === 'accepted' || friendStatus === 'pending'}
                style={{ borderRadius: 8, border: 'none', marginBottom: 12 }}>
                {friendStatus === 'accepted' ? '已是好友' : friendStatus === 'pending' ? '已发送请求' : '添加好友'}
              </Button>
            )}
            <Divider style={{ margin: '4px 0' }} />
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 8, marginTop: 8, color: '#666' }}>成就徽章</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              {userBadges.length === 0 ? (
                <span style={{ fontSize: 12, color: '#ccc' }}>暂无徽章</span>
              ) : userBadges.map((b: any) => (
                <div key={b.id} style={{ textAlign: 'center', width: 64, opacity: b.earned ? 1 : 0.35, filter: b.earned ? 'none' : 'grayscale(0.8)' }}>
                  <div style={{ fontSize: 28, marginBottom: 2 }}>{b.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: b.earned ? '#333' : '#999' }}>{b.name}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
