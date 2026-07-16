'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Form, Input, Button, Tabs, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

const authErrors: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码错误',
  'Email not confirmed': '邮箱尚未验证，请查收验证邮件',
  'User not found': '用户不存在',
  'User already registered': '该邮箱已注册',
  'Password should be at least 6 characters': '密码至少6位',
  'Unable to validate email': '邮箱格式无效',
}

function translateError(msg: string, map: Record<string, string> = authErrors): string {
  const rateMatch = msg.match(/only request this after (\d+)/)
  if (rateMatch) {
    return `操作太频繁，请 ${rateMatch[1]} 秒后再试`
  }
  for (const [key, val] of Object.entries(map)) {
    if (msg.includes(key)) return val
  }
  return msg
}

const profileErrors: Record<string, string> = {
  'duplicate key value violates unique constraint "profiles_username_key"': '用户名已被使用',
  'duplicate key value violates unique constraint "profiles_pkey"': '该邮箱已注册',
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      setLoading(false)
      message.error(translateError(error.message, authErrors))
      return
    }
    const pending = localStorage.getItem('pending_username')
    if (pending) {
      localStorage.removeItem('pending_username')
      await supabase.from('profiles')
        .update({ username: pending })
        .eq('id', data.user.id)
    }
    setLoading(false)
    message.success('登录成功')
    router.replace('/dashboard')
  }

  const handleRegister = async (values: { email: string; password: string; username: string }) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setLoading(false)
      message.error(translateError(error.message, authErrors))
      return
    }
    if (!data.user) {
      setLoading(false)
      message.error('注册失败')
      return
    }
    const identities = data.user.identities ?? []
    if (identities.length === 0) {
      await supabase.auth.signOut().catch(() => {})
      setLoading(false)
      message.error('该邮箱已注册')
      return
    }
    localStorage.setItem('pending_username', values.username)
    setLoading(false)
    message.success('注册成功，请查看邮箱验证邮件后登录')
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
      <Card style={{ width: 400, borderRadius: 12 }}>
        <h2 style={{ textAlign: 'center', marginBottom: 8, color: '#409EFF' }}>随机挑战生成器</h2>
        <p style={{ textAlign: 'center', color: '#999', marginBottom: 24 }}>完成每日挑战，成为更好的自己</p>
        <Tabs centered items={[
          {
            key: 'login',
            label: '登录',
            children: (
              <Form onFinish={handleLogin} size="large">
                <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
                  <Input prefix={<MailOutlined />} placeholder="邮箱" />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
              </Form>
            )
          },
          {
            key: 'register',
            label: '注册',
            children: (
              <Form onFinish={handleRegister} size="large">
                <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
                  <Input prefix={<UserOutlined />} placeholder="用户名" />
                </Form.Item>
                <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
                  <Input prefix={<MailOutlined />} placeholder="邮箱" />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, min: 6, message: '密码至少6位' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block>注册</Button>
              </Form>
            )
          }
        ]} />
      </Card>
    </div>
  )
}
