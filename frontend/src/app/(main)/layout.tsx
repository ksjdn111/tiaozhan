'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsProps } from 'antd'
import { HomeOutlined, AppstoreOutlined, UserOutlined, TeamOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const tabItems: TabsProps['items'] = [
  { key: '/dashboard', label: '今日', icon: <HomeOutlined /> },
  { key: '/feed', label: '广场', icon: <AppstoreOutlined /> },
  { key: '/friends', label: '朋友', icon: <TeamOutlined /> },
  { key: '/profile', label: '我的', icon: <UserOutlined /> },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace('/login')
      else setReady(true)
    })
  }, [router])

  if (!ready) return null

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
          activeKey={pathname}
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
