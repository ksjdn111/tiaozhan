export interface Profile {
  id: string
  username: string
  avatar_url?: string
  created_at: string
}

export interface Challenge {
  id: number
  title: string
  description: string
  category: string
  difficulty: number
}

export interface DailyChallenge {
  id: number
  user_id: string
  challenge_id: number
  challenge?: Challenge
  date: string
  status: 'pending' | 'done' | 'skipped'
  note?: string
  photo_url?: string
  created_at: string
}

export interface Like {
  id: number
  user_id: string
  daily_challenge_id: number
  created_at: string
}

export interface Badge {
  id: number
  name: string
  icon: string
  description: string
  condition: Record<string, unknown>
}

export interface UserBadge {
  id: number
  user_id: string
  badge_id: number
  badge?: Badge
  earned_at: string
}

export interface UserStats {
  total_days: number
  total_completed: number
  streak: number
  total_likes_received: number
}
