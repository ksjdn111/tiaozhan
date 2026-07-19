import { supabase } from './supabase'

export async function getToken(retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    const { data: { session: refreshed } } = await supabase.auth.refreshSession()
    if (refreshed?.access_token) return refreshed.access_token
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.access_token) return session.access_token
    if (i < retries - 1) await new Promise(r => setTimeout(r, 500))
  }
  return ''
}

export async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id || ''
}

export async function requireAuth(router: any): Promise<string> {
  const token = await getToken()
  if (!token) { router.replace('/login'); return '' }
  return token
}