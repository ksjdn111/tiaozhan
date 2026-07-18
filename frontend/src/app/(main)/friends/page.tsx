'use client'

import { useEffect, useState, useRef } from 'react'
import { Card, Button, Spin, Empty, message, Modal, Input, List, Avatar, Tag, Badge, Tabs, Divider } from 'antd'
import { UserAddOutlined, UserOutlined, MessageOutlined, SendOutlined, TeamOutlined, SearchOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

export default function FriendsPage() {
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatFriend, setChatFriend] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [msgText, setMsgText] = useState('')
  const [msgLoading, setMsgLoading] = useState(false)
  const [tabKey, setTabKey] = useState('friends')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || ''
  }

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

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

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

  const openChat = async (friend: any) => {
    setChatFriend(friend)
    setChatOpen(true)
    setMsgLoading(true)
    const token = await getToken()
    const res = await fetch(`${API}/friends/messages/${friend.friend_id}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.code === 0) setMessages(data.data)
    setMsgLoading(false)
  }

  const handleSendMsg = async () => {
    if (!msgText.trim()) return
    const token = await getToken()
    const res = await fetch(`${API}/friends/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiver_id: chatFriend.friend_id, content: msgText.trim() })
    })
    const data = await res.json()
    if (data.code === 0) {
      setMessages([...messages, {
        id: Date.now(), sender_id: 'me', content: msgText.trim(),
        created_at: new Date().toISOString(), is_me: true
      }])
      setMsgText('')
    } else {
      message.error(data.message || '发送失败')
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
              <List.Item style={{ padding: '10px 0', cursor: 'pointer' }}
                actions={[
                  <Button key="chat" type="text" icon={<MessageOutlined />}
                    onClick={() => openChat(f)}
                    style={{ color: '#667eea' }} />
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
                  description={<span style={{ fontSize: 12, color: '#999' }}>{f.bio || '暂无简介'}</span>}
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
                    onClick={() => handleRespond(r.id, true)}
                    style={{ borderRadius: 8, border: 'none' }} />,
                  <Button key="reject" size="small" icon={<CloseOutlined />}
                    onClick={() => handleRespond(r.id, false)}
                    style={{ borderRadius: 8 }} />
                ]}>
                <List.Item.Meta
                  avatar={r.profile?.avatar_url ? (
                    <Avatar src={r.profile.avatar_url} size={40} />
                  ) : (
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
        <Input.Search
          placeholder="搜索用户名"
          value={searchQuery}
          onChange={e => handleSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        {searching ? <Spin style={{ display: 'block', textAlign: 'center', margin: 16 }} /> : (
          searchResults.length === 0 ? (
            searchQuery ? <Empty description="未找到用户" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null
          ) : (
            <List dataSource={searchResults} renderItem={(u: any) => (
              <List.Item style={{ padding: '8px 0' }}
                actions={[
                  <Button key="add" type="primary" size="small" icon={<UserAddOutlined />}
                    onClick={() => handleAddFriend(u.id)}
                    style={{ borderRadius: 8, border: 'none' }}>
                    添加
                  </Button>
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

      {/* Chat modal */}
      <Modal title={chatFriend ? `与 ${chatFriend.username} 聊天` : '聊天'} open={chatOpen}
        onCancel={() => { setChatOpen(false); setChatFriend(null); setMessages([]) }}
        footer={null} centered width={400}>
        <div style={{ height: 320, overflow: 'auto', marginBottom: 12, padding: '4px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {msgLoading ? <Spin style={{ display: 'block', textAlign: 'center', marginTop: 80 }} /> : (
            messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#ccc', marginTop: 80 }}>暂无消息，开始聊天吧</div>
            ) : (
              messages.map((m: any) => (
                <div key={m.id} style={{
                  display: 'flex', justifyContent: m.is_me ? 'flex-end' : 'flex-start',
                  marginBottom: 4,
                }}>
                  <div style={{
                    maxWidth: '75%', padding: '8px 14px',
                    borderRadius: m.is_me ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                    background: m.is_me ? '#667eea' : '#f0f0f0',
                    color: m.is_me ? '#fff' : '#333',
                    fontSize: 14, lineHeight: 1.5,
                  }}>
                    {m.content}
                    <div style={{ fontSize: 10, opacity: 0.6, marginTop: 2, textAlign: 'right' }}>
                      {new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )
          )}
          <div ref={chatEndRef} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input value={msgText} onChange={e => setMsgText(e.target.value)}
            placeholder="输入消息..." maxLength={1000}
            style={{ borderRadius: 10, flex: 1 }}
            onPressEnter={handleSendMsg}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendMsg}
            style={{ borderRadius: 10, border: 'none' }} />
        </div>
      </Modal>
    </div>
  )
}
