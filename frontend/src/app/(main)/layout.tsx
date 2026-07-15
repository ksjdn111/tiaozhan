'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Tabs, TabsProps } from 'antd'
import { HomeOutlined, AppstoreOutlined, UserOutlined } from '@ant-design/icons'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const tabItems: TabsProps['items'] = [
  { key: '/dashboard', label: '今日挑战', icon: <HomeOutlined /> },
  { key: '/feed', label: '挑战广场', icon: <AppstoreOutlined /> },
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
    <div style={{ maxWidth: 480, margin: '0 auto', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ paddingBottom: 56 }}>
        {children}
      </div>
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: '#fff', borderTop: '1px solid #f0f0f0' }}>
        <Tabs
          activeKey={pathname}
          centered
          onTabClick={(key) => router.push(key)}
          items={tabItems}
          style={{ marginBottom: 0 }}
        />
      </div>
    </div>
  )
}
