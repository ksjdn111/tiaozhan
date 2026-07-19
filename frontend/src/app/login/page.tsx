'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Form, Input, Button, Tabs, Progress, message } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, CheckCircleFilled, CloseCircleFilled, ThunderboltOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'
import { API } from '@/lib/api'

const authErrors: Record<string, string> = {
  'Invalid login credentials': '邮箱或密码错误',
  'Email not confirmed': '邮箱尚未验证，请查收验证邮件',
  'User not found': '用户不存在',
  'User already registered': '该邮箱已注册',
  'Password should be at least 6 characters': '密码至少6位',
  'Unable to validate email': '邮箱格式无效',
}

const ruleLabels: { key: string; label: string }[] = [
  { key: 'min8', label: '至少 8 个字符' },
  { key: 'upper', label: '包含大写字母' },
  { key: 'lower', label: '包含小写字母' },
  { key: 'number', label: '包含数字' },
  { key: 'special', label: '包含特殊字符 (!@#$%^&*)' },
]

function checkPasswordStrength(pwd: string) {
  const checks = {
    min8: pwd.length >= 8,
    upper: /[A-Z]/.test(pwd),
    lower: /[a-z]/.test(pwd),
    number: /\d/.test(pwd),
    special: /[!@#$%^&*(),.?":{}|<>_\-]/.test(pwd),
  }
  const passed = Object.values(checks).filter(Boolean).length
  const score = Math.round((passed / ruleLabels.length) * 100)
  return { checks, passed, score }
}

function StrengthBar({ pwd }: { pwd: string }) {
  const { checks, score } = checkPasswordStrength(pwd)
  const color = score === 100 ? '#52c41a' : score >= 60 ? '#faad14' : '#ff4d4f'
  return (
    <div style={{ margin: '4px 0 8px' }}>
      <Progress percent={pwd ? score : 0} showInfo={false} strokeColor={color} size="small" />
      <div style={{ fontSize: 12, marginTop: 4 }}>
        {ruleLabels.map(r => (
          <div key={r.key} style={{ color: checks[r.key as keyof typeof checks] ? '#52c41a' : '#999', marginBottom: 2 }}>
            {checks[r.key as keyof typeof checks]
              ? <CheckCircleFilled style={{ color: '#52c41a', marginRight: 4 }} />
              : <CloseCircleFilled style={{ color: '#999', marginRight: 4 }} />}
            {r.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function translateError(msg: string, map: Record<string, string> = authErrors): string {
  const rateMatch = msg.match(/only request this after (\d+)/)
  if (rateMatch) return `操作太频繁，请 ${rateMatch[1]} 秒后再试`
  for (const [key, val] of Object.entries(map)) {
    if (msg.includes(key)) return val
  }
  return msg
}

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [regPwd, setRegPwd] = useState('')
  const [form] = Form.useForm()

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
      await supabase.from('profiles').update({ username: pending }).eq('id', data.user.id)
    }
    setLoading(false)
    message.success('登录成功')
    router.replace('/dashboard')
  }

  const handleRegister = async (values: { email: string; password: string; username: string }) => {
    const { checks } = checkPasswordStrength(values.password)
    if (Object.values(checks).some(v => !v)) return

    setLoading(true)
    const checkRes = await fetch(`${API}/auth/check-username?username=${encodeURIComponent(values.username)}`)
    const checkData = await checkRes.json()
    if (checkData.code === 0 && checkData.data?.exists) {
      setLoading(false)
      message.error('用户名已被使用')
      return
    }
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
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: 16,
    }}>
      <Card style={{
        width: '100%', maxWidth: 400, borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        overflow: 'hidden',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px',
          }}>
            <ThunderboltOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <h2 className="gradient-text" style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>随机挑战生成器</h2>
          <p style={{ color: '#999', fontSize: 13, marginTop: 4 }}>完成每日挑战，成为更好的自己</p>
        </div>
        <Tabs centered items={[
          {
            key: 'login',
            label: '登录',
            children: (
              <Form onFinish={handleLogin} size="large" style={{ marginTop: 8 }}>
                <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
                  <Input prefix={<MailOutlined />} placeholder="邮箱" />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="密码" />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={loading} block size="large"
                  style={{ height: 48, borderRadius: 12, fontSize: 16 }}>
                  登录
                </Button>
              </Form>
            )
          },
          {
            key: 'register',
            label: '注册',
            children: (
              <Form form={form} onFinish={handleRegister} size="large" style={{ marginTop: 8 }}>
                <Form.Item name="username" rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 3, message: '用户名至少 3 个字符' },
                  { max: 20, message: '用户名最多 20 个字符' },
                  { pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, message: '只能包含字母、数字、下划线和中文' },
                ]}>
                  <Input prefix={<UserOutlined />} placeholder="用户名" maxLength={20} />
                </Form.Item>
                <Form.Item name="email" rules={[
                  { required: true, message: '请输入邮箱' },
                  { type: 'email', message: '邮箱格式不正确' },
                ]}>
                  <Input prefix={<MailOutlined />} placeholder="邮箱" />
                </Form.Item>
                <Form.Item name="password" rules={[
                  { required: true, message: '请输入密码' },
                  { max: 64, message: '密码最多 64 个字符' },
                ]}>
                  <Input.Password prefix={<LockOutlined />} placeholder="密码" maxLength={64} onChange={e => setRegPwd(e.target.value)} />
                </Form.Item>
                <StrengthBar pwd={regPwd} />
                <Button type="primary" htmlType="submit" loading={loading} block size="large"
                  style={{ height: 48, borderRadius: 12, fontSize: 16 }}
                  disabled={regPwd ? checkPasswordStrength(regPwd).score < 100 : true}>
                  注册
                </Button>
              </Form>
            )
          }
        ]} />
      </Card>
    </div>
  )
}
