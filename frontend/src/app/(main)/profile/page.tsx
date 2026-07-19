'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Spin, Empty, message, List, Tag, Modal, Input, Upload, Avatar, Divider } from 'antd'
import { LogoutOutlined, TrophyOutlined, EditOutlined, UserOutlined, FireOutlined, CheckCircleOutlined, HeartOutlined, BellOutlined, DeleteOutlined, MessageOutlined, HeartFilled, FileTextOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getToken, getUserId } from '@/lib/auth'
import { API } from '@/lib/api'

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [badges, setBadges] = useState<any[]>([])
  const [allBadges, setAllBadges] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editOpen, setEditOpen] = useState(false)
  const [editUsername, setEditUsername] = useState('')
  const [editing, setEditing] = useState(false)
  const [usernameError, setUsernameError] = useState('')
  const [avatarModalOpen, setAvatarModalOpen] = useState(false)
  const [bioModalOpen, setBioModalOpen] = useState(false)
  const [editBio, setEditBio] = useState('')
  const [bioUpdating, setBioUpdating] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarUpdating, setAvatarUpdating] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  const [myPosts, setMyPosts] = useState<any[]>([])
  const [myLikes, setMyLikes] = useState<any[]>([])
  const [myComments, setMyComments] = useState<any[]>([])
  const [listModalOpen, setListModalOpen] = useState(false)
  const [listType, setListType] = useState<'posts' | 'likes' | 'comments'>('posts')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await getToken()
        if (!token) { setError('未登录，请重新登录'); setLoading(false); return }

        const [profileRes, statsRes, badgesRes, historyRes, allBadgesRes, notifRes, postsRes, likesRes, commentsRes] = await Promise.all([
          fetch(`${API}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/badges/stats`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/badges/user`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/challenge/history?size=5`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/badges/list`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/feed/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/feed/my-posts`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/feed/my-likes`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/feed/my-comments`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        const profileData = await profileRes.json()
        const statsData = await statsRes.json()
        const badgesData = await badgesRes.json()
        const historyData = await historyRes.json()
        const allBadgesData = await allBadgesRes.json()
        const notifData = await notifRes.json()
        const postsData = await postsRes.json()
        const likesData = await likesRes.json()
        const commentsData = await commentsRes.json()

        if (profileData.code === 0) setProfile(profileData.data)
        if (statsData.code === 0) setStats(statsData.data)
        if (badgesData.code === 0) setBadges(badgesData.data)
        if (historyData.code === 0) setHistory(historyData.data)
        if (allBadgesData.code === 0) setAllBadges(allBadgesData.data)
        if (notifData.code === 0) setNotifications(notifData.data)
        if (postsData.code === 0) setMyPosts(postsData.data)
        if (likesData.code === 0) setMyLikes(likesData.data)
        if (commentsData.code === 0) setMyComments(commentsData.data)
        if (profileData.code !== 0) setError(profileData.message || '获取个人信息失败')
      } catch { setError('网络错误') }
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!editUsername || editUsername.length < 3 || editUsername === profile?.username) { setUsernameError(''); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`${API}/auth/check-username?username=${encodeURIComponent(editUsername)}`)
      const data = await res.json()
      if (data.code === 0 && data.data?.exists) setUsernameError('该用户名已被注册')
      else setUsernameError('')
    }, 500)
    return () => clearTimeout(timer)
  }, [editUsername, profile?.username])

  const handleEdit = () => { setEditUsername(profile?.username || ''); setEditOpen(true) }

  const handleSaveUsername = async () => {
    if (!editUsername.trim()) { message.error('用户名不能为空'); return }
    if (editUsername.length < 3 || editUsername.length > 20) { message.error('用户名长度需 3-20 个字符'); return }
    if (usernameError) { message.error(usernameError); return }
    setEditing(true)
    const token = await getToken()
    const res = await fetch(`${API}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: editUsername.trim() }),
    })
    const data = await res.json()
    if (data.code === 0) { setProfile({ ...profile, username: editUsername.trim() }); message.success('用户名更新成功'); setEditOpen(false) }
    else message.error(data.message || '更新失败')
    setEditing(false)
  }

  const handleAvatarUpload = async (file: File) => {
    const userId = await getUserId()
    const ext = file.name.split('.').pop()
    const filePath = `avatars/${userId}.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true })
    if (uploadError) { message.error('头像上传失败，请确认已创建 avatars 存储桶'); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)
    const token = await getToken()
    const res = await fetch(`${API}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar_url: publicUrl }),
    })
    const data = await res.json()
    if (data.code !== 0) { message.error(data.message || '保存失败'); return }
    setProfile({ ...profile, avatar_url: publicUrl }); setAvatarModalOpen(false); message.success('头像更新成功')
  }

  const handleSetAvatarUrl = async () => {
    if (!avatarUrl.trim()) { message.error('请输入头像链接'); return }
    setAvatarUpdating(true)
    const token = await getToken()
    const res = await fetch(`${API}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar_url: avatarUrl.trim() }),
    })
    const data = await res.json()
    if (data.code === 0) { setProfile({ ...profile, avatar_url: avatarUrl.trim() }); message.success('头像更新成功'); setAvatarModalOpen(false) }
    else message.error(data.message || '更新失败')
    setAvatarUpdating(false)
  }

  const handleSaveBio = async () => {
    if (editBio.length > 200) { message.error('简介最长200个字符'); return }
    setBioUpdating(true)
    const token = await getToken()
    const res = await fetch(`${API}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bio: editBio.trim() }),
    })
    const data = await res.json()
    if (data.code === 0) { setProfile({ ...profile, bio: editBio.trim() }); message.success('简介已更新'); setBioModalOpen(false) }
    else message.error(data.message || '更新失败')
    setBioUpdating(false)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.replace('/login') }

  if (loading) return (
    <div>
      <div className="skeleton" style={{ width: '100%', height: 120 }} />
      <div style={{ padding: 16 }}>
        <div className="skeleton" style={{ width: 80, height: 80, borderRadius: '50%', margin: '-40px auto 16px', position: 'relative', zIndex: 1 }} />
        <div className="skeleton" style={{ height: 20, width: '40%', margin: '0 auto 16px' }} />
        <div className="skeleton" style={{ height: 80, borderRadius: 14, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 120, borderRadius: 14 }} />
      </div>
    </div>
  )
  if (error) return <Empty description={error} style={{ paddingTop: 80 }} />

  return (
    <div>
      <div className="banner-placeholder" />

      {/* Profile header */}
      <div style={{ textAlign: 'center', marginTop: -40, padding: '0 16px', position: 'relative', zIndex: 1 }}>
        <Avatar size={80} src={profile?.avatar_url} icon={<UserOutlined />}
          style={{ border: '3px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', cursor: 'pointer', background: 'linear-gradient(135deg, #667eea, #764ba2)' }}
          onClick={() => setAvatarModalOpen(true)} />
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 700 }}>{profile?.username || '未设置用户名'}</span>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={handleEdit} style={{ fontSize: 14 }} />
        </div>
        <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span style={{ fontSize: 13, color: '#888', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile?.bio || '暂无简介'}
          </span>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditBio(profile?.bio || ''); setBioModalOpen(true) }} style={{ fontSize: 12, color: '#bbb' }} />
        </div>

        {/* Stats row */}
        {stats && (
          <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 16, padding: '12px 0', background: '#fafafa', borderRadius: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <FireOutlined style={{ fontSize: 18, color: '#fa8c16', display: 'block', marginBottom: 4 }} />
              <div style={{ fontWeight: 700, fontSize: 18 }}>{stats.total_days}</div>
              <div style={{ fontSize: 12, color: '#999' }}>累计天数</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <CheckCircleOutlined style={{ fontSize: 18, color: '#52c41a', display: 'block', marginBottom: 4 }} />
              <div style={{ fontWeight: 700, fontSize: 18 }}>{stats.total_completed}</div>
              <div style={{ fontSize: 12, color: '#999' }}>完成挑战</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <HeartOutlined style={{ fontSize: 18, color: '#ff4d4f', display: 'block', marginBottom: 4 }} />
              <div style={{ fontWeight: 700, fontSize: 18 }}>{stats.total_likes_received}</div>
              <div style={{ fontSize: 12, color: '#999' }}>获得赞</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {/* 3-tab bar: 帖子 / 点赞 / 评论 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <div onClick={() => { setListType('posts'); setListModalOpen(true) }} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: '#f0f5ff', borderRadius: 12, cursor: 'pointer' }}>
            <FileTextOutlined style={{ fontSize: 20, color: '#667eea', display: 'block', marginBottom: 2 }} />
            <div style={{ fontWeight: 700, fontSize: 18, color: '#667eea' }}>{myPosts.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>帖子</div>
          </div>
          <div onClick={() => { setListType('likes'); setListModalOpen(true) }} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: '#fff0f0', borderRadius: 12, cursor: 'pointer' }}>
            <HeartFilled style={{ fontSize: 20, color: '#ff4d4f', display: 'block', marginBottom: 2 }} />
            <div style={{ fontWeight: 700, fontSize: 18, color: '#ff4d4f' }}>{myLikes.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>点赞</div>
          </div>
          <div onClick={() => { setListType('comments'); setListModalOpen(true) }} style={{ flex: 1, textAlign: 'center', padding: '12px 0', background: '#f0fff0', borderRadius: 12, cursor: 'pointer' }}>
            <MessageOutlined style={{ fontSize: 20, color: '#52c41a', display: 'block', marginBottom: 2 }} />
            <div style={{ fontWeight: 700, fontSize: 18, color: '#52c41a' }}>{myComments.length}</div>
            <div style={{ fontSize: 12, color: '#999' }}>评论</div>
          </div>
        </div>

        {/* Notifications */}
        <Card style={{ borderRadius: 14, marginBottom: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', cursor: 'pointer' }}
          onClick={() => setNotifOpen(true)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BellOutlined style={{ fontSize: 18, color: '#667eea' }} />
            <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>通知</span>
            {notifications.length > 0 && (
              <span style={{ fontSize: 12, color: '#999' }}>
                最近 {notifications.slice(0, 3).map((n: any) => n.user?.username).join('、')} 等 {notifications.length} 条互动
              </span>
            )}
            <span style={{ color: '#ccc', fontSize: 12 }}>查看 &gt;</span>
          </div>
        </Card>

        {/* Badges */}
        <Card style={{ borderRadius: 14, marginBottom: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          title={<div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyOutlined style={{ color: '#faad14' }} /><span>成就徽章</span></div>}>
          {allBadges.length === 0
            ? <Empty description="还没有徽章，继续挑战吧！" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                {allBadges.map((badge: any) => {
                  const earned = badges.some((b: any) => b.badge_id === badge.id)
                  return (
                    <div key={badge.id} style={{ textAlign: 'center', width: 80, opacity: earned ? 1 : 0.4, filter: earned ? 'none' : 'grayscale(0.8)', transition: 'all 0.2s' }}>
                      <div style={{ fontSize: 32, marginBottom: 4 }}>{badge.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: earned ? '#333' : '#999' }}>{badge.name}</div>
                      <div style={{ fontSize: 10, color: earned ? '#52c41a' : '#bbb', marginTop: 2 }}>{earned ? '✅ 已获得' : badge.description}</div>
                    </div>
                  )
                })}
              </div>
          }
        </Card>

        {/* History */}
        <Card style={{ borderRadius: 14, marginBottom: 12, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} title="最近记录">
          {history.length === 0 ? <Empty description="还没有记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            : <List dataSource={history} renderItem={(item: any) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <List.Item.Meta title={<span style={{ fontSize: 14 }}>{item.challenge?.title}</span>}
                    description={<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <Tag color={item.status === 'done' ? 'green' : 'default'} style={{ borderRadius: 4 }}>{item.status === 'done' ? '已完成' : item.status === 'skipped' ? '已跳过' : '待完成'}</Tag>
                      <span style={{ fontSize: 12, color: '#ccc' }}>{item.date}</span>
                      {item.photo_url && <img src={item.photo_url} alt="pic" style={{ width: 40, height: 40, borderRadius: 6, objectFit: 'cover', cursor: 'pointer' }} onClick={() => window.open(item.photo_url, '_blank')} />}
                    </div>} />
                </List.Item>
              )} />
          }
        </Card>

        {/* Logout */}
        <div style={{ textAlign: 'center', marginTop: 24, marginBottom: 16 }}>
          <Button danger icon={<LogoutOutlined />} onClick={handleLogout} style={{ borderRadius: 10, height: 40, width: '100%', maxWidth: 200 }}>退出登录</Button>
        </div>
      </div>

      {/* List modal for posts/likes/comments */}
      <Modal title={listType === 'posts' ? `我的帖子 (${myPosts.length})` : listType === 'likes' ? `我的点赞 (${myLikes.length})` : `我的评论 (${myComments.length})`}
        open={listModalOpen} onCancel={() => setListModalOpen(false)} footer={null} centered width={420}>
        {listType === 'posts' && (myPosts.length === 0 ? <Empty description="暂无帖子" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          : <List dataSource={myPosts} renderItem={(p: any) => (
              <List.Item style={{ padding: '8px 0', cursor: 'pointer' }} onClick={() => { setListModalOpen(false); router.push(`/feed/${p.id}`) }}>
                <List.Item.Meta title={<span style={{ fontSize: 14 }}>{p.challenge?.title || '自定义挑战'}</span>}
                  description={<span style={{ fontSize: 12, color: '#999' }}>{p.date || p.created_at?.substring(0, 10)}</span>} />
              </List.Item>
            )} /> )}
        {listType === 'likes' && (myLikes.length === 0 ? <Empty description="暂无点赞" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          : <List dataSource={myLikes} renderItem={(p: any) => (
              <List.Item style={{ padding: '8px 0', cursor: 'pointer' }} onClick={() => { setListModalOpen(false); router.push(`/feed/${p.id}`) }}>
                <List.Item.Meta title={<span style={{ fontSize: 14 }}>{p.challenge?.title || '自定义挑战'}</span>}
                  description={<span style={{ fontSize: 12, color: '#999' }}>点赞于 {p.liked_at?.substring(0, 10) || ''}</span>} />
              </List.Item>
            )} /> )}
        {listType === 'comments' && (myComments.length === 0 ? <Empty description="暂无评论" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          : <List dataSource={myComments} renderItem={(c: any) => (
              <List.Item style={{ padding: '8px 0', cursor: 'pointer' }} onClick={() => { setListModalOpen(false); router.push(`/feed/${c.daily_challenge_id || ''}`) }}>
                <List.Item.Meta title={<span style={{ fontSize: 14 }}>{c.content}</span>}
                  description={<span style={{ fontSize: 12, color: '#999' }}>{new Date(c.created_at).toLocaleString('zh-CN')}</span>} />
              </List.Item>
            )} /> )}
      </Modal>

      {/* Notifications modal */}
      <Modal title={<span><BellOutlined /> 互动通知</span>} open={notifOpen} onCancel={() => setNotifOpen(false)} footer={null} centered width={400}>
        {notifications.length === 0 ? <Empty description="暂无互动" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          : <List dataSource={notifications} renderItem={(n: any) => (
              <List.Item style={{ padding: '10px 0', cursor: 'pointer' }} onClick={() => { setNotifOpen(false); router.push(`/feed/${n.daily_challenge_id}`) }}>
                <List.Item.Meta avatar={n.user?.avatar_url ? <Avatar src={n.user.avatar_url} size={36} /> : <Avatar size={36} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>{(n.user?.username || '?')[0]}</Avatar>}
                  title={<span style={{ fontSize: 13 }}><strong>{n.user?.username}</strong>{n.type === 'like' ? ' 赞了你的挑战' : ' 评论了你的挑战'}</span>}
                  description={<div><span style={{ fontSize: 12, color: '#999' }}>《{n.challenge_title}》</span>{n.content && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>{n.content}</p>}<span style={{ fontSize: 11, color: '#ccc' }}>{new Date(n.created_at).toLocaleString('zh-CN')}</span></div>} />
              </List.Item>
            )} /> }
      </Modal>

      {/* Avatar modal */}
      <Modal title="修改头像" open={avatarModalOpen} onCancel={() => setAvatarModalOpen(false)} footer={null} centered>
        <div style={{ textAlign: 'center', marginBottom: 16 }}><Avatar size={100} src={avatarUrl || profile?.avatar_url} icon={<UserOutlined />} style={{ border: '2px solid #e8e8e8' }} /></div>
        <p style={{ marginBottom: 8, fontWeight: 500 }}>上传图片：</p>
        <Upload showUploadList={false} beforeUpload={(file) => { handleAvatarUpload(file); return false }} accept="image/*">
          <Button block style={{ borderRadius: 10 }}>选择图片上传</Button>
        </Upload>
        <div style={{ margin: '12px 0', textAlign: 'center', color: '#ccc' }}>—— 或 ——</div>
        <Input value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.jpg" style={{ borderRadius: 10 }} />
        <Button type="primary" block style={{ marginTop: 8, borderRadius: 10, height: 40 }} loading={avatarUpdating} onClick={handleSetAvatarUrl}>应用链接</Button>
      </Modal>

      {/* Bio modal */}
      <Modal title="修改个人简介" open={bioModalOpen} onOk={handleSaveBio} onCancel={() => setBioModalOpen(false)} confirmLoading={bioUpdating} centered>
        <Input.TextArea value={editBio} onChange={e => setEditBio(e.target.value)} placeholder="介绍一下自己吧" maxLength={200} showCount rows={3} style={{ borderRadius: 10 }} />
      </Modal>

      {/* Username modal */}
      <Modal title="修改用户名" open={editOpen} onOk={handleSaveUsername} onCancel={() => setEditOpen(false)} confirmLoading={editing} centered>
        <Input value={editUsername} onChange={e => { setEditUsername(e.target.value); setUsernameError('') }} placeholder="请输入用户名" maxLength={20} showCount style={{ borderRadius: 10 }} status={usernameError ? 'error' : undefined} />
        {usernameError && <p style={{ fontSize: 12, color: '#ff4d4f', marginTop: 4 }}>{usernameError}</p>}
        <p style={{ fontSize: 12, color: '#999', marginTop: 8 }}>3-20 个字符，支持字母、数字、下划线和中文</p>
      </Modal>
    </div>
  )
}