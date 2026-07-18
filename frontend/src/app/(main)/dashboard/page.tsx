'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Spin, Tag, Input, message, Empty, Upload } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, PlusOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

const difficultyColors: Record<number, string> = { 1: 'green', 2: 'cyan', 3: 'orange', 4: 'red', 5: 'purple' }

const categoryIcons: Record<string, string> = {
  '运动': '🏃', '美食': '🍳', '学习': '📚', '创意': '🎨', '生活': '🏠'
}

export default function DashboardPage() {
  const [challenge, setChallenge] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || ''
  }

  const fetchToday = async () => {
    setLoading(true)
    setError('')
    setNote('')
    setPhotoUrl('')
    try {
      const token = await getToken()
      if (!token) { setError('未登录，请重新登录'); setLoading(false); return }
      const res = await fetch(`${API}/challenge/today`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.code === 0) { setChallenge(data.data); setError('') }
      else { setError(data.message || '获取挑战失败') }
    } catch {
      setError('网络错误，请确认后端服务已启动')
    }
    setLoading(false)
  }

  useEffect(() => { fetchToday() }, [])

  const handlePhotoUpload = async (file: File) => {
    const userId = await getUserId()
    const ext = file.name.split('.').pop()
    const filePath = `proofs/${userId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('proofs')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      message.error('图片上传失败')
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('proofs')
      .getPublicUrl(filePath)

    setPhotoUrl(publicUrl)
    message.success('图片已上传')
  }

  const handleComplete = async () => {
    setActionLoading(true)
    const token = await getToken()
    const body: any = { daily_challenge_id: challenge.id, note }
    if (photoUrl) body.photo_url = photoUrl
    await fetch(`${API}/challenge/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    })
    message.success('挑战完成！')
    setChallenge({ ...challenge, status: 'done' })
    setActionLoading(false)
  }

  const handleSkip = async () => {
    setActionLoading(true)
    const token = await getToken()
    await fetch(`${API}/challenge/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ daily_challenge_id: challenge.id })
    })
    message.info('已跳过')
    setChallenge({ ...challenge, status: 'skipped' })
    setActionLoading(false)
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 100 }}><Spin size="large" /></div>
  if (error) return <Empty description={error} />
  if (!challenge) return <Empty description="暂无挑战" />

  const c = challenge.challenge

  return (
    <div style={{ padding: 16 }}>
      <Card style={{ borderRadius: 12, marginTop: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 48 }}>{categoryIcons[c.category] || '🎯'}</span>
          <h2 style={{ margin: '8px 0' }}>{c.title}</h2>
          <Tag color={difficultyColors[c.difficulty] || 'default'}>
            {'⭐'.repeat(c.difficulty)}
          </Tag>
          <Tag>{c.category}</Tag>
        </div>
        <p style={{ fontSize: 15, color: '#666', lineHeight: 1.6 }}>{c.description}</p>

        {challenge.status === 'pending' && (
          <>
            <Input.TextArea
              rows={2}
              placeholder="记录你的完成感受（选填）"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ marginTop: 12 }}
            />
            <div style={{ marginTop: 12 }}>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => { handlePhotoUpload(file); return false }}
                accept="image/*"
              >
                <Button icon={<PlusOutlined />}>
                  {photoUrl ? '已上传图片' : '上传图片证明（选填）'}
                </Button>
              </Upload>
              {photoUrl && (
                <div style={{ marginTop: 8 }}>
                  <img src={photoUrl} alt="proof" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} />
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <Button type="primary" icon={<CheckCircleOutlined />} loading={actionLoading} onClick={handleComplete} block size="large">
                完成挑战
              </Button>
              <Button icon={<CloseCircleOutlined />} loading={actionLoading} onClick={handleSkip} size="large">
                跳过
              </Button>
            </div>
          </>
        )}

        {challenge.status === 'done' && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a' }} />
            <p style={{ color: '#52c41a', fontSize: 16, marginTop: 8 }}>已完成！</p>
            <Button icon={<ThunderboltOutlined />} onClick={fetchToday} style={{ marginTop: 8 }}>
              再来一个
            </Button>
          </div>
        )}

        {challenge.status === 'skipped' && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <CloseCircleOutlined style={{ fontSize: 48, color: '#999' }} />
            <p style={{ color: '#999', fontSize: 16, marginTop: 8 }}>已跳过</p>
            <Button icon={<ThunderboltOutlined />} onClick={fetchToday}>换一个挑战</Button>
          </div>
        )}
      </Card>
    </div>
  )
}
