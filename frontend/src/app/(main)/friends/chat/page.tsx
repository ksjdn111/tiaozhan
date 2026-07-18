'use client'

import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button, Spin, Empty, message, Input, Avatar } from 'antd'
import { ArrowLeftOutlined, SendOutlined, UserOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const friendId = searchParams.get('id')
  const friendName = searchParams.get('name')

  const [messages, setMessages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [msgText, setMsgText] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const fetchMessages = async () => {
    if (!friendId) return
    const token = await getToken()
    const res = await fetch(`${API}/friends/messages/${friendId}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.code === 0) setMessages(data.data)
    setLoading(false)
  }

  useEffect(() => {
    if (!friendId) { setLoading(false); return }
    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)
    return () => clearInterval(interval)
  }, [friendId])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!msgText.trim()) return
    const token = await getToken()
    const res = await fetch(`${API}/friends/messages/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ receiver_id: friendId, content: msgText.trim() })
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

  if (!friendId) return <Empty description="未指定聊天对象" style={{ paddingTop: 80 }} />

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => router.back()} style={{ fontSize: 16 }} />
        <Avatar size={36} icon={<UserOutlined />}
          style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)' }} />
        <span style={{ fontWeight: 600, fontSize: 16 }}>{friendName || '聊天'}</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '8px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading ? (
          <Spin style={{ display: 'block', textAlign: 'center', marginTop: 80 }} />
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#ccc', marginTop: 80 }}>暂无消息，开始聊天吧</div>
        ) : (
          messages.map((m: any) => (
            <div key={m.id} style={{
              display: 'flex', justifyContent: m.is_me ? 'flex-end' : 'flex-start',
              marginBottom: 2,
            }}>
              <div style={{
                maxWidth: '75%', padding: '10px 16px',
                borderRadius: m.is_me ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: m.is_me ? '#667eea' : '#f0f0f0',
                color: m.is_me ? '#fff' : '#333',
                fontSize: 14, lineHeight: 1.6,
              }}>
                {m.content}
                <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4, textAlign: 'right' }}>
                  {new Date(m.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: '1px solid #f0f0f0' }}>
        <Input value={msgText} onChange={e => setMsgText(e.target.value)}
          placeholder="输入消息..." maxLength={1000}
          style={{ borderRadius: 10, flex: 1 }}
          onPressEnter={handleSend}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={handleSend}
          style={{ borderRadius: 10, border: 'none' }} />
      </div>
    </div>
  )
}
