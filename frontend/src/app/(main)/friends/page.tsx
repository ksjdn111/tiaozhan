'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Spin, Empty, message, Modal, Input, List, Avatar, Tag, Badge, Tabs } from 'antd'
import { UserAddOutlined, UserOutlined, MessageOutlined, TeamOutlined, CheckOutlined, CloseOutlined, DeleteOutlined } from '@ant-design/icons'
import { getToken } from '@/lib/auth'
import { API } from '@/lib/api'

export default function FriendsPage() {
  const router = useRouter()
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [tabKey, setTabKey] = useState('friends')

  // getToken imported from @/lib/auth

  const fetchData = async () => {
    try {
      const token = await getToken()
      if (!token) { setError('未登录'); setLoading(false); return }
      const [friendsRes, reqRes] = await Promise.all([
        fetch(`${API}/friends/list`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/friends/requests`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const fd = await friendsRes.json()
      const rd = await reqRes.json()
      if (fd.code === 0) setFriends(fd.data)
      if (rd.code === 0) setRequests(rd.data)
    } catch {
      setError('网络错误')
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleSearch = async (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) { setSearchResults([]); return }
    setSearching(true)
    const token = await getToken()
    const res = await fetch(`${API}/friends/search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.code === 0) setSearchResults(data.data)
    setSearching(false)
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
      setSearchOpen(false)
    } else {
      message.error(data.message || '操作失败')
    }
  }

  const handleRespond = async (requestId: number, accept: boolean) => {
    const token = await getToken()
    const res = await fetch(`${API}/friends/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ request_id: requestId, accept })
    })
    const data = await res.json()
    if (data.code === 0) {
      message.success(accept ? '已接受好友请求' : '已拒绝')
      fetchData()
    }
  }

  if (loading) return (
    <div style={{ padding: 16 }}>
      <div className="skeleton" style={{ height: 24, width: '30%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 80, marginBottom: 12, borderRadius: 14 }} />
      <div className="skeleton" style={{ height: 80, borderRadius: 14 }} />
    </div>
  )
  if (error) return <Empty description={error} style={{ paddingTop: 80 }} />

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TeamOutlined style={{ fontSize: 22, color: '#667eea' }} />
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>好友</h2>
          {requests.length > 0 && (
            <Badge count={requests.length} style={{ fontSize: 11 }} />
          )}
        </div>
        <Button type="primary" icon={<UserAddOutlined />} onClick={() => setSearchOpen(true)}
          style={{ borderRadius: 10, height: 36, border: 'none' }}>
          添加好友
        </Button>
      </div>

      <Tabs activeKey={tabKey} onChange={setTabKey} items={[
        {
          key: 'friends',
          label: <span>好友列表 <span style={{ color: '#999', fontSize: 12 }}>({friends.length})</span></span>,
          children: friends.length === 0 ? (
            <Empty description="还没有好友" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List dataSource={friends} renderItem={(f: any) => (
              <List.Item style={{ padding: '10px 0' }}
                actions={[
                  <Button key="chat" type="text" icon={<MessageOutlined />}
                    onClick={() => router.push(`/friends/chat?id=${f.friend_id}&name=${encodeURIComponent(f.username)}`)}
                    style={{ color: '#667eea' }} />,
                  <Button key="delete" type="text" icon={<DeleteOutlined />}
                    onClick={async () => { const token = await getToken(); await fetch(`${API}/friends/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ friend_id: f.friend_id }) }); message.success('已删除'); fetchData() }}
                    style={{ color: '#ff4d4f' }} />
                ]}>
                <List.Item.Meta
                  avatar={f.avatar_url ? (
                    <Avatar src={f.avatar_url} size={44} />
                  ) : (
                    <Avatar size={44} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                      {(f.username || '?')[0]}
                    </Avatar>
                  )}
                  title={<span style={{ fontWeight: 600 }}>{f.username}</span>}
                  description={
                    <div>
                      {f.last_message ? (
                        <span style={{ fontSize: 12, color: f.from_me ? '#bbb' : '#999' }}>
                          {f.from_me ? `你: ${f.last_message.substring(0, 20)}${f.last_message.length > 20 ? '...' : ''}` : f.last_message.substring(0, 25)}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: '#999' }}>{f.bio || '暂无简介'}</span>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )} />
          )
        },
        {
          key: 'requests',
          label: <span>请求 {requests.length > 0 && <Tag color="red" style={{ fontSize: 10 }}>{requests.length}</Tag>}</span>,
          children: requests.length === 0 ? (
            <Empty description="暂无好友请求" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <List dataSource={requests} renderItem={(r: any) => (
              <List.Item style={{ padding: '10px 0' }}
                actions={[
                  <Button key="accept" type="primary" size="small" icon={<CheckOutlined />}
                    onClick={() => handleRespond(r.id, true)} style={{ borderRadius: 8, border: 'none' }} />,
                  <Button key="reject" size="small" icon={<CloseOutlined />}
                    onClick={() => handleRespond(r.id, false)} style={{ borderRadius: 8 }} />
                ]}>
                <List.Item.Meta
                  avatar={r.profile?.avatar_url ? <Avatar src={r.profile.avatar_url} size={40} /> : (
                    <Avatar size={40} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                      {(r.profile?.username || '?')[0]}
                    </Avatar>
                  )}
                  title={<span style={{ fontWeight: 600 }}>{r.profile?.username}</span>}
                  description={<span style={{ fontSize: 12, color: '#999' }}>请求添加你为好友</span>}
                />
              </List.Item>
            )} />
          )
        }
      ]} />

      {/* Search modal */}
      <Modal title="添加好友" open={searchOpen} onCancel={() => { setSearchOpen(false); setSearchResults([]); setSearchQuery('') }}
        footer={null} centered>
        <Input.Search placeholder="搜索用户名" value={searchQuery}
          onChange={e => handleSearch(e.target.value)} style={{ marginBottom: 12 }} />
        {searching ? <Spin style={{ display: 'block', textAlign: 'center', margin: 16 }} /> : (
          searchResults.length === 0 ? (searchQuery ? <Empty description="未找到用户" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null) : (
            <List dataSource={searchResults} renderItem={(u: any) => (
              <List.Item style={{ padding: '8px 0' }}
                actions={[
                  <Button key="add" type="primary" size="small" icon={<UserAddOutlined />}
                    onClick={() => handleAddFriend(u.id)} style={{ borderRadius: 8, border: 'none' }}>添加</Button>
                ]}>
                <List.Item.Meta
                  avatar={u.avatar_url ? <Avatar src={u.avatar_url} size={36} /> : (
                    <Avatar size={36} style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }}>
                      {(u.username || '?')[0]}
                    </Avatar>
                  )}
                  title={<span style={{ fontWeight: 600 }}>{u.username}</span>}
                  description={<span style={{ fontSize: 12, color: '#999' }}>{u.bio || '暂无简介'}</span>}
                />
              </List.Item>
            )} />
          )
        )}
      </Modal>
    </div>
  )
}
