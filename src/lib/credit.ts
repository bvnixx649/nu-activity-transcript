import type { Activity, Credit, LateCancel, Registration } from '../data/types'
import { CANCEL_DAYS, STRIKE_LIMIT } from '../config'
import { closedAt } from './stage'

const DAY = 24 * 3600_000

/**
 * Semesters for the credit count: ภาค 1 is 1 May to 31 Oct, ภาค 2 is 1 Nov to 30 Apr.
 * Credits reset at the start of each.
 */
export function semesterStart(t = Date.now()) {
  const d = new Date(t)
  const m = d.getMonth()
  if (m >= 4 && m <= 9) return new Date(d.getFullYear(), 4, 1).getTime()
  return new Date(m >= 10 ? d.getFullYear() : d.getFullYear() - 1, 10, 1).getTime()
}

export function semesterEnd(t = Date.now()) {
  const s = new Date(semesterStart(t))
  return new Date(s.getFullYear(), s.getMonth() + 6, 1).getTime()
}

/** Last moment a registration can be cancelled without losing a credit. */
export function freeCancelUntil(a: Activity) {
  return a.start - (a.cancelDays ?? CANCEL_DAYS) * DAY
}

export const waiverKey = (activityId: string, studentId: string) => `${activityId}:${studentId}`

export interface Strike {
  a: Activity
  kind: 'late' | 'noshow'
  at: number
  waived: boolean
}

interface Src {
  activities: Activity[]
  registrations: Registration[]
  credits: Credit[]
  lateCancels: LateCancel[]
  waivers: string[]
}

/** Every credit lost this semester, newest first. Waived ones are included but flagged. */
export function strikesOf(s: Src, studentId: string, now = Date.now()): Strike[] {
  const from = semesterStart(now)
  const byId = new Map(s.activities.map((a) => [a.id, a]))
  const waived = new Set(s.waivers)
  const out: Strike[] = []
  s.lateCancels.forEach((c) => {
    const a = byId.get(c.activityId)
    if (c.studentId === studentId && a && c.at >= from) out.push({ a, kind: 'late', at: c.at, waived: waived.has(waiverKey(a.id, studentId)) })
  })
  const credited = new Set(s.credits.filter((c) => c.studentId === studentId).map((c) => c.activityId))
  s.registrations.forEach((r) => {
    if (r.studentId !== studentId || credited.has(r.activityId)) return
    const a = byId.get(r.activityId)
    const closed = a && closedAt(a, now)
    if (a && closed && a.end >= from) out.push({ a, kind: 'noshow', at: closed, waived: waived.has(waiverKey(a.id, studentId)) })
  })
  return out.sort((x, y) => y.at - x.at)
}

export function creditsLeft(s: Src, studentId: string, now = Date.now()) {
  return Math.max(0, STRIKE_LIMIT - strikesOf(s, studentId, now).filter((x) => !x.waived).length)
}
