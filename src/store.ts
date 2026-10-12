import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { toast } from 'sonner'
import type { Activity, ChatMsg, Credit, Notice, NoticeKind, NotifySettings, Registration, Student } from './data/types'
import {
  EXTRA_REGISTERED,
  ORGS,
  PERSONAL_CREDITS,
  PERSONAL_REGS,
  personalNotices,
  seedActivities,
  seedChats,
  seedRegistrations,
  seedStudents,
} from './data/seed'
import { hashPin } from './lib/qr'
import { uid } from './lib/format'
import { systemNotify } from './lib/device'

const H = 3600_000

export interface SupSession {
  code: string
  org: string
  name: string
}

interface Data {
  activities: Activity[]
  students: Record<string, Student>
  registrations: Registration[]
  credits: Credit[]
  chats: ChatMsg[]
  notices: Notice[]
  extraReg: Record<string, number>
  settings: NotifySettings
  me: string | null
  sup: SupSession | null
  mode: 'student' | 'supervisor'
  seededAt: number
}

interface Actions {
  signUp: (s: { id: string; name: string; faculty: string; pin: string }) => void
  login: (id: string, pin: string) => 'ok' | 'unknown' | 'wrong'
  logout: () => void
  register: (activityId: string) => void
  cancel: (activityId: string) => void
  addCredit: (c: Credit) => boolean
  revokeCredit: (activityId: string, studentId: string) => void
  addWalkIn: (activityId: string, s: Student) => void
  removeRegistration: (activityId: string, studentId: string) => void
  upsertActivity: (a: Activity, isNew: boolean) => void
  postAnnouncement: (activityId: string, text: string, images: string[]) => void
  sendChat: (activityId: string, text: string, asSup: boolean) => void
  notify: (kind: NoticeKind, title: string, body: string, activityId?: string) => void
  markAllRead: () => void
  setSettings: (p: Partial<NotifySettings>) => void
  supLogin: (code: string, name: string) => boolean
  setMode: (m: 'student' | 'supervisor') => void
  supLogout: () => void
  rebase: () => void
  resetDemo: () => void
}

export type State = Data & Actions

function freshData(): Data {
  const now = Date.now()
  const students = seedStudents()
  const activities = seedActivities(now)
  const { regs, credits } = seedRegistrations(students, activities)
  return {
    activities,
    students: Object.fromEntries(students.map((s) => [s.id, s])),
    registrations: regs,
    credits,
    chats: seedChats(students, now),
    notices: [],
    extraReg: { ...EXTRA_REGISTERED },
    settings: { enabled: false, newActivities: true, announcements: true, chat: false, reminders: true },
    me: null,
    sup: null,
    mode: 'student',
    seededAt: now,
  }
}

// localStorage can be full (posters are data URLs) or blocked in private mode.
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k)
    } catch {
      return null
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v)
    } catch {
      toast.error('พื้นที่เก็บข้อมูลในเครื่องเต็ม ลองใช้รูปที่เล็กลง')
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k)
    } catch {
      /* ignore */
    }
  },
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...freshData(),

      signUp: ({ id, name, faculty, pin }) => {
        const now = Date.now()
        set((s) => {
          const acts = s.activities
          const regs = s.registrations.filter((r) => r.studentId !== id)
          PERSONAL_REGS.forEach((aid, i) => regs.push({ activityId: aid, studentId: id, at: now - (2 + i) * 24 * H }))
          const credits = s.credits.filter((c) => c.studentId !== id)
          PERSONAL_CREDITS.forEach((aid) => {
            const a = acts.find((x) => x.id === aid)
            if (!a) return
            regs.push({ activityId: aid, studentId: id, at: a.start - 5 * 24 * H })
            credits.push({
              activityId: aid,
              studentId: id,
              hours: a.hours,
              category: a.category,
              title: a.title,
              at: a.end - 20 * 60_000,
              method: 'qr',
              distance: 24,
              ref: uid().slice(0, 8).toUpperCase(),
            })
          })
          return {
            students: { ...s.students, [id]: { id, name, faculty, pinHash: hashPin(id, pin) } },
            registrations: regs,
            credits,
            notices: personalNotices(now),
            me: id,
            mode: 'student',
          }
        })
      },

      login: (id, pin) => {
        const st = get().students[id]
        if (!st || !st.pinHash) return 'unknown'
        if (st.pinHash !== hashPin(id, pin)) return 'wrong'
        set({ me: id, mode: 'student' })
        return 'ok'
      },

      logout: () => set({ me: null, sup: null, mode: 'student' }),

      register: (activityId) => {
        const { me, registrations, activities } = get()
        if (!me || registrations.some((r) => r.activityId === activityId && r.studentId === me)) return
        set({ registrations: [...registrations, { activityId, studentId: me, at: Date.now() }] })
        const a = activities.find((x) => x.id === activityId)
        if (a) get().notify('registered', 'ลงทะเบียนสำเร็จ', a.title, a.id)
      },

      cancel: (activityId) => {
        const { me } = get()
        set((s) => ({ registrations: s.registrations.filter((r) => !(r.activityId === activityId && r.studentId === me)) }))
      },

      addCredit: (c) => {
        if (get().credits.some((x) => x.activityId === c.activityId && x.studentId === c.studentId)) return false
        set((s) => ({ credits: [...s.credits, c] }))
        return true
      },

      revokeCredit: (activityId, studentId) =>
        set((s) => ({ credits: s.credits.filter((c) => !(c.activityId === activityId && c.studentId === studentId)) })),

      addWalkIn: (activityId, st) => {
        const a = get().activities.find((x) => x.id === activityId)
        if (!a) return
        set((s) => ({
          students: s.students[st.id] ? s.students : { ...s.students, [st.id]: st },
          registrations: s.registrations.some((r) => r.activityId === activityId && r.studentId === st.id)
            ? s.registrations
            : [...s.registrations, { activityId, studentId: st.id, at: Date.now() }],
        }))
        get().addCredit({
          activityId,
          studentId: st.id,
          hours: a.hours,
          category: a.category,
          title: a.title,
          at: Date.now(),
          method: 'manual',
        })
      },

      removeRegistration: (activityId, studentId) =>
        set((s) => ({
          registrations: s.registrations.filter((r) => !(r.activityId === activityId && r.studentId === studentId)),
          credits: s.credits.filter((c) => !(c.activityId === activityId && c.studentId === studentId)),
        })),

      upsertActivity: (a, isNew) => {
        set((s) => ({
          activities: isNew ? [a, ...s.activities] : s.activities.map((x) => (x.id === a.id ? a : x)),
        }))
        if (isNew) get().notify('new', `กิจกรรมใหม่จาก${a.org}`, `${a.title} ได้รับ ${a.hours} ชั่วโมง`, a.id)
      },

      postAnnouncement: (activityId, text, images) => {
        const a = get().activities.find((x) => x.id === activityId)
        if (!a) return
        const ann = { id: uid(), text, images, at: Date.now() }
        set((s) => ({
          activities: s.activities.map((x) => (x.id === activityId ? { ...x, announcements: [ann, ...x.announcements] } : x)),
        }))
        get().notify('announce', a.title, text.length > 90 ? text.slice(0, 88) + '...' : text, a.id)
      },

      sendChat: (activityId, text, asSup) => {
        const { me, sup, students } = get()
        const authorId = asSup ? 'sup' : me ?? 'guest'
        const authorName = asSup ? sup?.name ?? 'ผู้คุมกิจกรรม' : students[me ?? '']?.name ?? 'นิสิต'
        set((s) => ({ chats: [...s.chats, { id: uid(), activityId, authorId, authorName, text, at: Date.now(), sup: asSup }] }))
      },

      notify: (kind, title, body, activityId) => {
        const { settings } = get()
        const allowed =
          kind === 'new' ? settings.newActivities : kind === 'announce' ? settings.announcements : kind === 'chat' ? settings.chat : true
        if (!allowed) return
        set((s) => ({ notices: [{ id: uid(), kind, title, body, activityId, at: Date.now(), read: false }, ...s.notices].slice(0, 60) }))
        if (settings.enabled) systemNotify(title, body, activityId ? `/a/${activityId}` : '/inbox')
      },

      markAllRead: () => set((s) => ({ notices: s.notices.map((n) => (n.read ? n : { ...n, read: true })) })),

      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),

      supLogin: (code, name) => {
        const c = code.trim().toUpperCase()
        const org = ORGS[c]
        if (!org) return false
        set({ sup: { code: c, org, name: name.trim() || 'ผู้คุมกิจกรรม' }, mode: 'supervisor' })
        return true
      },

      setMode: (mode) => set({ mode }),
      supLogout: () => set({ sup: null, mode: 'student' }),

      rebase: () => {
        const { seededAt } = get()
        const delta = Math.floor((Date.now() - seededAt) / H) * H
        if (delta < 3 * H) return
        const sh = (t: number) => t + delta
        set((s) => ({
          seededAt: s.seededAt + delta,
          activities: s.activities.map((a) =>
            a.seed
              ? {
                  ...a,
                  start: sh(a.start),
                  end: sh(a.end),
                  createdAt: sh(a.createdAt),
                  announcements: a.announcements.map((n) => ({ ...n, at: sh(n.at) })),
                }
              : a,
          ),
          registrations: s.registrations.map((r) => ({ ...r, at: sh(r.at) })),
          credits: s.credits.map((c) => ({ ...c, at: sh(c.at) })),
          chats: s.chats.map((c) => ({ ...c, at: sh(c.at) })),
          notices: s.notices.map((n) => ({ ...n, at: sh(n.at) })),
        }))
      },

      resetDemo: () => {
        const keep = get()
        const d = freshData()
        set(d)
        if (keep.me && keep.students[keep.me]) {
          const me = keep.students[keep.me]
          set({ students: { ...get().students, [me.id]: me } })
          // re-run personal seeding with the existing PIN hash
          const pinHash = me.pinHash
          get().signUp({ id: me.id, name: me.name, faculty: me.faculty, pin: '' })
          set((s) => ({ students: { ...s.students, [me.id]: { ...me, pinHash } } }))
        }
      },
    }),
    {
      name: 'nuat-demo-v1',
      storage: createJSONStorage(() => safeStorage),
      version: 1,
    },
  ),
)

/* ───────── derived helpers (pure, call inside useMemo) ───────── */

export function regCount(s: Pick<Data, 'registrations' | 'extraReg'>, activityId: string) {
  return s.registrations.filter((r) => r.activityId === activityId).length + (s.extraReg[activityId] ?? 0)
}

export function isRegistered(s: Pick<Data, 'registrations' | 'me'>, activityId: string) {
  return !!s.me && s.registrations.some((r) => r.activityId === activityId && r.studentId === s.me)
}

export function myCredit(s: Pick<Data, 'credits' | 'me'>, activityId: string) {
  return s.credits.find((c) => c.activityId === activityId && c.studentId === s.me)
}
