'use client'

import { useEffect, useState } from 'react'
import { Card, Button, Spin, Tag, Input, message, Empty, Upload, Progress, Modal, Select, Form } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ThunderboltOutlined, PlusOutlined, FireOutlined, TrophyOutlined, EditOutlined } from '@ant-design/icons'
import { supabase } from '@/lib/supabase'

const API = '/api'

const difficultyColors: Record<number, string> = { 1: '#52c41a', 2: '#13c2c2', 3: '#fa8c16', 4: '#f5222d', 5: '#722ed1' }
const difficultyLabels: Record<number, string> = { 1: '简单', 2: '轻松', 3: '中等', 4: '困难', 5: '极限' }

const categoryIcons: Record<string, string> = {
  '运动': '🏃', '美食': '🍳', '学习': '📚', '创意': '🎨', '生活': '🏠'
}
const categoryColors: Record<string, string> = {
  '运动': '#e6f7ff', '美食': '#fff7e6', '学习': '#f0f5ff', '创意': '#f9f0ff', '生活': '#e6fffb'
}

export default function DashboardPage() {
  const [challenge, setChallenge] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [streak, setStreak] = useState(0)
  const [newBadges, setNewBadges] = useState<any[]>([])
  const [customOpen, setCustomOpen] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customDesc, setCustomDesc] = useState('')
  const [customCategory, setCustomCategory] = useState('运动')
  const [customDifficulty, setCustomDifficulty] = useState(3)
  const [customLoading, setCustomLoading] = useState(false)

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const getUserId = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user?.id || ''
  }

  const handleCreateCustom = async () => {
    if (!customTitle.trim()) { message.error('请输入挑战标题'); return }
    if (!customDesc.trim()) { message.error('请输入挑战描述'); return }
    setCustomLoading(true)
    const token = await getToken()
    const res = await fetch(`${API}/challenge/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ title: customTitle.trim(), description: customDesc.trim(), category: customCategory, difficulty: customDifficulty })
    })
    const data = await res.json()
    if (data.code === 0) {
      message.success('自定义挑战已创建！')
      setCustomOpen(false)
      setCustomTitle('')
      setCustomDesc('')
      fetchToday()
    } else {
      message.error(data.message || '创建失败')
    }
    setCustomLoading(false)
  }

  const fetchToday = async () => {
    setLoading(true)
    setError('')
    setNote('')
    setPhotoUrl('')
    try {
      const token = await getToken()
      if (!token) { setError('未登录，请重新登录'); setLoading(false); return }
      const [challengeRes, statsRes] = await Promise.all([
        fetch(`${API}/challenge/today`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/badges/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const challengeData = await challengeRes.json()
      const statsData = await statsRes.json()
      if (challengeData.code === 0) { setChallenge(challengeData.data); setError('') }
      else { setError(challengeData.message || '获取挑战失败') }
      if (statsData.code === 0) setStreak(statsData.data.total_days || 0)
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
    const { error: uploadError } = await supabase.storage.from('proofs').upload(filePath, file, { upsert: true })
    if (uploadError) { message.error('图片上传失败'); return }
    const { data: { publicUrl } } = supabase.storage.from('proofs').getPublicUrl(filePath)
    setPhotoUrl(publicUrl)
    message.success('图片已上传')
  }

  const handleComplete = async () => {
    setActionLoading(true)
    const token = await getToken()
    const body: any = { daily_challenge_id: challenge.id, note }
    if (photoUrl) body.photo_url = photoUrl
    const res = await fetch(`${API}/challenge/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (data.new_badges && data.new_badges.length > 0) {
      setNewBadges(data.new_badges)
    }
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

  if (loading) return (
    <div style={{ padding: 16, marginTop: 16 }}>
      <div className="skeleton" style={{ height: 24, width: '40%', margin: '0 auto 16px' }} />
      <div className="skeleton" style={{ height: 200, borderRadius: 14 }} />
    </div>
  )
  if (error) return <Empty description={error} style={{ paddingTop: 80 }} />
  if (!challenge) return <Empty description="暂无挑战" style={{ paddingTop: 80 }} />

  const c = challenge.challenge

  return (
    <div style={{ padding: 16 }}>
      {/* Streak bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, padding: '10px 16px', background: 'linear-gradient(135deg, #fff7e6, #ffe7ba)',
        borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FireOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
          <span style={{ fontWeight: 600, color: '#d46b08' }}>已连续 {streak} 天</span>
        </div>
        <TrophyOutlined style={{ fontSize: 20, color: '#faad14' }} />
      </div>

      {/* Custom challenge button */}
      <Button
        icon={<EditOutlined />}
        onClick={() => setCustomOpen(true)}
        size="small"
        style={{ marginBottom: 12, borderRadius: 8, float: 'right' }}
      >
        创建自定义挑战
      </Button>
      <div style={{ clear: 'both' }} />

      {/* Challenge card */}
      <Card style={{
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        border: 'none',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16,
            background: categoryColors[c.category] || '#f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 32,
          }}>
            {categoryIcons[c.category] || '🎯'}
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>{c.title}</h2>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
            <Tag color={difficultyColors[c.difficulty]}>{difficultyLabels[c.difficulty]}</Tag>
            <Tag style={{ background: categoryColors[c.category] || '#f0f0f0', border: 'none', color: '#666' }}>{c.category}</Tag>
          </div>
        </div>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.7, margin: 0, textAlign: 'center' }}>{c.description}</p>

        {challenge.status === 'pending' && (
          <>
            <Input.TextArea
              rows={2}
              placeholder="记录你的完成感受（选填）"
              value={note}
              onChange={e => setNote(e.target.value)}
              style={{ marginTop: 16, borderRadius: 10, borderColor: '#e8e8e8' }}
            />
            <div style={{ marginTop: 12 }}>
              <Upload
                showUploadList={false}
                beforeUpload={(file) => { handlePhotoUpload(file); return false }}
                accept="image/*"
              >
                <Button icon={<PlusOutlined />} style={{ borderRadius: 10 }}>
                  {photoUrl ? '✅ 已上传图片' : '📷 添加图片证明'}
                </Button>
              </Upload>
              {photoUrl && (
                <img src={photoUrl} alt="proof" style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 10, marginTop: 8 }} />
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <Button
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={actionLoading}
                onClick={handleComplete}
                block size="large"
                style={{ height: 48, borderRadius: 12, fontSize: 16, border: 'none' }}
              >
                完成挑战
              </Button>
              <Button
                icon={<CloseCircleOutlined />}
                loading={actionLoading}
                onClick={handleSkip}
                size="large"
                style={{ height: 48, borderRadius: 12, fontSize: 16 }}
              >
                跳过
              </Button>
            </div>
          </>
        )}

        {challenge.status === 'done' && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#f6ffed', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <CheckCircleOutlined style={{ fontSize: 36, color: '#52c41a' }} />
            </div>
            <p style={{ color: '#52c41a', fontSize: 18, fontWeight: 600, margin: '0 0 16px' }}>已完成！</p>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={fetchToday}
              size="large"
              style={{ borderRadius: 10, height: 44, minWidth: 160 }}
            >
              再来一个
            </Button>
          </div>
        )}

        {challenge.status === 'skipped' && (
          <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: '#f5f5f5', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
            }}>
              <CloseCircleOutlined style={{ fontSize: 36, color: '#999' }} />
            </div>
            <p style={{ color: '#999', fontSize: 18, fontWeight: 600, margin: '0 0 16px' }}>已跳过</p>
            <Button
              icon={<ThunderboltOutlined />}
              onClick={fetchToday}
              size="large"
              style={{ borderRadius: 10, height: 44, minWidth: 160 }}
            >
              换一个挑战
            </Button>
          </div>
        )}
      </Card>
      {/* Custom challenge modal */}
      <Modal title="创建自定义挑战" open={customOpen} onCancel={() => setCustomOpen(false)} onOk={handleCreateCustom} confirmLoading={customLoading} centered>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="挑战标题" maxLength={100} showCount style={{ borderRadius: 10 }} />
          <Input.TextArea value={customDesc} onChange={e => setCustomDesc(e.target.value)} placeholder="挑战描述" rows={3} style={{ borderRadius: 10 }} />
          <Select value={customCategory} onChange={setCustomCategory} style={{ borderRadius: 10 }}
            options={['运动', '美食', '学习', '创意', '生活'].map(c => ({ label: c, value: c }))} />
          <Select value={customDifficulty} onChange={setCustomDifficulty} style={{ borderRadius: 10 }}
            options={[1,2,3,4,5].map(d => ({ label: `${'★'.repeat(d)}${'☆'.repeat(5-d)} (${d}级)`, value: d }))} />
        </div>
      </Modal>

      {/* Badge unlock modal */}
      <Modal
        open={newBadges.length > 0}
        onCancel={() => setNewBadges([])}
        footer={null}
        centered
        width={320}
        closable={false}
      >
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <TrophyOutlined style={{ fontSize: 48, color: '#faad14' }} />
          <h3 style={{ margin: '12px 0 4px', fontSize: 20, fontWeight: 700, color: '#faad14' }}>🏆 解锁新成就！</h3>
          {newBadges.map((b: any) => (
            <div key={b.id} style={{ margin: '16px 0' }}>
              <div style={{ fontSize: 48 }}>{b.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginTop: 8 }}>{b.name}</div>
              <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{b.description}</div>
            </div>
          ))}
          <Button type="primary" onClick={() => setNewBadges([])} style={{ marginTop: 8, borderRadius: 10, height: 40, minWidth: 120 }}>
            太棒了！
          </Button>
        </div>
      </Modal>
    </div>
  )
}
