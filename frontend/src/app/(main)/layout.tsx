'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Tabs, Badge } from 'antd'
import { HomeOutlined, AppstoreOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const API = '/api'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }, [])

  const fetchUnread = useCallback(async () => {
    const token = await getToken()
    if (!token) return
    try {
      const res = await fetch(`${API}/friends/unread-count`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.code === 0) setUnreadCount(data.data.total || 0)
    } catch {}
  }, [getToken])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
      else setReady(true)
    })
  }, [router])

  useEffect(() => {
    if (!ready) return
    fetchUnread()
    const interval = setInterval(fetchUnread, 10000)
    return () => clearInterval(interval)
  }, [ready, fetchUnread])

  if (!ready) return null

  const tabItems = [
    { key: '/dashboard', label: '今日', icon: <HomeOutlined /> },
    { key: '/feed', label: '广场', icon: <AppstoreOutlined /> },
    {
      key: '/friends',
      label: unreadCount > 0 ? (
        <Badge count={unreadCount} size="small" offset={[4, -2]}>
          <span>朋友</span>
        </Badge>
      ) : '朋友',
      icon: <TeamOutlined />
    },
    { key: '/profile', label: '我的', icon: <UserOutlined /> },
  ]

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f5f7fa', position: 'relative' }}>
      <div className="page-enter" style={{ paddingBottom: 64 }}>
        {children}
      </div>
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        borderTop: 'none',
        padding: '4px 0 8px',
        boxShadow: '0 -2px 20px rgba(0,0,0,0.06)',
      }}>
        <Tabs
          activeKey={pathname.startsWith('/friends') ? '/friends' : pathname}
          centered
          onTabClick={(key) => router.push(key)}
          items={tabItems}
          style={{ marginBottom: 0 }}
          size="large"
        />
      </div>
    </div>
  )
}
