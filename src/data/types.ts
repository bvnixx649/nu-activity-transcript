export type Category = 'volunteer' | 'faculty'

export interface Announcement {
  id: string
  text: string
  images: string[]
  at: number
}

export interface Activity {
  id: string
  title: string
  category: Category
  org: string
  orgCode: string
  poster: string
  description: string
  place: string
  lat?: number
  lng?: number
  start: number
  end: number
  hours: number
  capacity: number
  supervisor: { name: string; phone: string }
  chatEnabled: boolean
  openChatUrl?: string
  announcements: Announcement[]
  createdAt: number
  /** Demo data: its dates slide forward so the demo always has a live activity. */
  seed?: boolean
}

export interface Student {
  id: string
  name: string
  faculty: string
  pinHash?: string
}

export interface Registration {
  activityId: string
  studentId: string
  at: number
}

export interface Credit {
  activityId: string
  studentId: string
  hours: number
  category: Category
  title: string
  at: number
  method: 'qr' | 'manual'
  distance?: number
  ref?: string
}

export interface ChatMsg {
  id: string
  activityId: string
  authorId: string
  authorName: string
  text: string
  at: number
  sup?: boolean
}

export type NoticeKind = 'new' | 'announce' | 'chat' | 'credit' | 'reminder' | 'registered'

export interface Notice {
  id: string
  kind: NoticeKind
  title: string
  body: string
  activityId?: string
  at: number
  read: boolean
}

export interface NotifySettings {
  enabled: boolean
  newActivities: boolean
  announcements: boolean
  chat: boolean
  reminders: boolean
}
