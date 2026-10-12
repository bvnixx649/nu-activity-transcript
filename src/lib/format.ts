import type { Activity, Category } from '../data/types'

const TH = 'th-TH'
const dayShort = new Intl.DateTimeFormat(TH, { weekday: 'short', day: 'numeric', month: 'short' })
const dateLong = new Intl.DateTimeFormat(TH, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const dateShort = new Intl.DateTimeFormat(TH, { day: 'numeric', month: 'short', year: 'numeric' })
const time = new Intl.DateTimeFormat(TH, { hour: '2-digit', minute: '2-digit', hour12: false })

export const fmtDay = (t: number) => dayShort.format(t)
export const fmtDateLong = (t: number) => dateLong.format(t)
export const fmtDate = (t: number) => dateShort.format(t)
export const fmtTime = (t: number) => time.format(t)
export const fmtRange = (a: number, b: number) => `${fmtTime(a)} - ${fmtTime(b)} น.`

export const fmtHours = (h: number) => (Number.isInteger(h) ? String(h) : h.toFixed(1))

export const CAT_LABEL: Record<Category, string> = { volunteer: 'จิตอาสา', faculty: 'กิจกรรมคณะ' }

const startOfDay = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function relDay(t: number, now = Date.now()) {
  const n = Math.round((startOfDay(t) - startOfDay(now)) / 86400000)
  if (n === 0) return 'วันนี้'
  if (n === 1) return 'พรุ่งนี้'
  if (n === -1) return 'เมื่อวาน'
  return n > 1 ? `อีก ${n} วัน` : `${-n} วันที่แล้ว`
}

export function timeAgo(t: number, now = Date.now()) {
  const s = Math.max(0, (now - t) / 1000)
  if (s < 60) return 'เมื่อสักครู่'
  if (s < 3600) return `${Math.floor(s / 60)} นาทีที่แล้ว`
  if (s < 86400) return `${Math.floor(s / 3600)} ชั่วโมงที่แล้ว`
  if (s < 172800) return 'เมื่อวาน'
  return fmtDate(t)
}

export type Phase = 'upcoming' | 'live' | 'ended'
export function phase(a: Activity, now = Date.now()): Phase {
  if (now < a.start) return 'upcoming'
  if (now <= a.end) return 'live'
  return 'ended'
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function initials(name: string) {
  const clean = name.replace(/^(นาย|นางสาว|นาง|ดร\.|อ\.|อาจารย์|พี่)\s*/, '').trim()
  return clean.slice(0, 1) || '?'
}

export function hueOf(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}
