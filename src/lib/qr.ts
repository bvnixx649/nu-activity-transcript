import { hmac } from '@noble/hashes/hmac.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { utf8ToBytes, bytesToHex } from '@noble/hashes/utils.js'
import type { Category } from '../data/types'

// Demo only: the real app verifies on the server so this key never ships to phones.
const SECRET = utf8ToBytes('nu-activity-transcript/demo-2569')
export const WINDOW_MS = 10_000

export interface QrPayload {
  v: 1
  a: string // activity id
  n: string // title
  h: number // hours
  c: Category
  w: number // time window index
  la?: number
  lo?: number
  ac?: number
}

const b64url = (bytes: Uint8Array) => {
  let s = ''
  bytes.forEach((b) => (s += String.fromCharCode(b)))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}
const sign = (body: string) => b64url(hmac(sha256, SECRET, utf8ToBytes(body)).slice(0, 12))

export const windowOf = (t = Date.now()) => Math.floor(t / WINDOW_MS)

export function makeToken(p: Omit<QrPayload, 'v' | 'w'>, now = Date.now()) {
  const payload: QrPayload = { v: 1, ...p, w: windowOf(now) }
  const body = b64url(utf8ToBytes(JSON.stringify(payload)))
  return `${body}.${sign(body)}`
}

export function claimUrl(token: string) {
  return `${location.origin}${location.pathname}#/claim?t=${token}`
}

export function extractToken(text: string): string | null {
  const t = text.trim()
  const i = t.indexOf('claim?t=')
  if (i >= 0) return decodeURIComponent(t.slice(i + 8).split('&')[0])
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)) return t
  return null
}

export type Verified = { ok: true; p: QrPayload; ref: string } | { ok: false; reason: 'invalid' | 'expired' }

export function verifyToken(token: string, now = Date.now()): Verified {
  const [body, sig] = token.split('.')
  if (!body || !sig || sign(body) !== sig) return { ok: false, reason: 'invalid' }
  let p: QrPayload
  try {
    p = JSON.parse(new TextDecoder().decode(fromB64url(body)))
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  const cur = windowOf(now)
  if (p.w < cur - 3 || p.w > cur + 1) return { ok: false, reason: 'expired' }
  return { ok: true, p, ref: bytesToHex(sha256(utf8ToBytes(sig))).slice(0, 8).toUpperCase() }
}

export const hashPin = (studentId: string, pin: string) => bytesToHex(sha256(utf8ToBytes(`${studentId}:${pin}:nuat`)))
