import { supabase } from './supabase'

export async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (session?.access_token) return session.access_token
  const { data: { session: refreshed } } = await supabase.auth.refreshSession()
  return refreshed?.access_token || ''
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