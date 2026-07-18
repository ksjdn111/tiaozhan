'use client'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import './globals.css'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ConfigProvider
          locale={zhCN}
          theme={{
            token: {
              colorPrimary: '#667eea',
              borderRadius: 10,
              fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
              colorBgLayout: '#f5f7fa',
              colorBgContainer: '#ffffff',
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
            },
            components: {
              Card: {
                borderRadiusLG: 14,
                paddingLG: 20,
              },
              Button: {
                borderRadiusLG: 10,
                controlHeightLG: 48,
              },
              Tabs: {
                inkBarColor: '#667eea',
                itemSelectedColor: '#667eea',
                itemColor: '#999',
              },
              Tag: {
                borderRadiusSM: 6,
              },
            },
          }}
        >
          {children}
        </ConfigProvider>
      </body>
    </html>
  )
}
