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
  /** Registration opens at this time. Missing means open on publish. */
  opensAt?: number
  /** Free cancellation until this many days before start. Missing means CANCEL_DAYS. */
  cancelDays?: number
  /** Supervisor closed the roster. After that, unscanned registrants count as no-shows. */
  closedAt?: number
  /** Roster sent to the volunteer centre. */
  submittedAt?: number
  /** The centre recorded the hours in the university system. */
  recordedAt?: number
  /** Supervisor hid the activity from students (registered students still see it). */
  hidden?: boolean
  /** With opensAt: students only see the activity once registration opens. */
  hideUntilOpen?: boolean
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
  /** Where tapping the notice goes. Defaults to the activity page. */
  to?: string
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

/** A cancellation after the free-cancel deadline. No-shows are derived from the roster, not stored. */
export interface LateCancel {
  activityId: string
  studentId: string
  at: number
}

/** Private message between one student and the supervisors of one activity, e.g. a reason for missing it. */
export interface DirectMsg {
  id: string
  activityId: string
  studentId: string
  fromSup: boolean
  authorName: string
  text: string
  at: number
  /** Read by the other side. */
  read: boolean
}
