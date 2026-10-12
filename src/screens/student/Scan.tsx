import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { CrosshairIcon, ImageSquareIcon, MapPinIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import type QrScannerType from 'qr-scanner'
import { useStore, isRegistered } from '../../store'
import { extractToken, makeToken } from '../../lib/qr'
import { getFix, type Fix, type GeoError } from '../../lib/geo'
import { haptic } from '../../lib/device'
import { phase } from '../../lib/format'
import { EASE_OUT } from '../../ui/kit'

export const FIX_KEY = 'nuat-last-fix'

export default function Scan() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<QrScannerType | null>(null)
  const handled = useRef(false)
  const [cam, setCam] = useState<'starting' | 'on' | 'error'>('starting')
  const [geo, setGeo] = useState<{ fix?: Fix; err?: GeoError }>({})

  const go = (data: string) => {
    if (handled.current) return
    const token = extractToken(data)
    if (!token) {
      toast('QR นี้ไม่ใช่ของ NU Activity', { id: 'bad-qr' })
      return
    }
    handled.current = true
    haptic.tap()
    navigate(`/claim?t=${encodeURIComponent(token)}`, { replace: true })
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { default: QrScanner } = await import('qr-scanner')
      if (cancelled || !videoRef.current) return
      const scanner = new QrScanner(videoRef.current, (r) => go(r.data), {
        preferredCamera: 'environment',
        maxScansPerSecond: 12,
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: false,
      })
      scannerRef.current = scanner
      try {
        await scanner.start()
        if (!cancelled) setCam('on')
      } catch {
        if (!cancelled) setCam('error')
      }
    })()
    return () => {
      cancelled = true
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getFix()
      .then((fix) => {
        setGeo({ fix })
        sessionStorage.setItem(FIX_KEY, JSON.stringify(fix))
      })
      .catch((err: GeoError) => setGeo({ err }))
  }, [])

  const fromImage = async (file?: File) => {
    if (!file) return
    const { default: QrScanner } = await import('qr-scanner')
    try {
      const r = await QrScanner.scanImage(file, { returnDetailedScanResult: true })
      go(r.data)
    } catch {
      toast.error('ไม่พบ QR ในรูปนี้')
    }
  }

  return (
    <div className="scanner">
      <video ref={videoRef} playsInline muted />

      <motion.div
        className="scan-frame"
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}
      >
        <svg viewBox="0 0 100 100" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" aria-hidden>
          <path d="M3 24 V14 A11 11 0 0 1 14 3 H24" />
          <path d="M76 3 H86 A11 11 0 0 1 97 14 V24" />
          <path d="M97 76 V86 A11 11 0 0 1 86 97 H76" />
          <path d="M24 97 H14 A11 11 0 0 1 3 86 V76" />
        </svg>
      </motion.div>

      <div className="scan-top">
        <button className="icon-btn glass" onClick={() => navigate(-1)} aria-label="ปิด">
          <XIcon size={20} weight="bold" />
        </button>
        <span className="t-strong" style={{ fontSize: 17 }}>
          สแกนรับชั่วโมง
        </span>
        <button className="icon-btn glass" onClick={() => fileRef.current?.click()} aria-label="เลือกรูป QR จากเครื่อง">
          <ImageSquareIcon size={20} weight="bold" />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => fromImage(e.target.files?.[0])} />
      </div>

      <div className="scan-bottom">
        {cam === 'error' ? (
          <CameraFallback onPick={() => fileRef.current?.click()} />
        ) : (
          <p style={{ fontSize: 15, opacity: 0.85, maxWidth: 280 }}>เล็ง QR บนหน้าจอของผู้คุมกิจกรรม ระบบจะยืนยันให้อัตโนมัติ</p>
        )}
        <span className="pill-glass">
          {geo.fix ? (
            <>
              <MapPinIcon size={16} weight="fill" color="#3ccf7f" /> ตำแหน่งพร้อม แม่นยำ ±{Math.round(geo.fix.acc)} ม.
            </>
          ) : geo.err ? (
            <>
              <WarningCircleIcon size={16} weight="fill" color="#ff9a5e" />
              {geo.err === 'denied' ? 'ยังไม่ได้อนุญาตตำแหน่ง' : 'ยังหาตำแหน่งไม่ได้'}
            </>
          ) : (
            <>
              <CrosshairIcon size={16} weight="bold" /> กำลังหาตำแหน่ง
            </>
          )}
        </span>
      </div>
    </div>
  )
}

/** No camera (desktop, or permission denied): offer an image, or a demo scan of the live activity. */
function CameraFallback({ onPick }: { onPick: () => void }) {
  const navigate = useNavigate()
  const s = useStore()
  const live = s.activities.find((a) => phase(a) === 'live' && isRegistered(s, a.id))

  const demo = async () => {
    if (!live) return
    let fix: Fix | undefined
    try {
      fix = await getFix(6000)
    } catch {
      /* demo still works without GPS */
    }
    const token = makeToken({ a: live.id, n: live.title, h: live.hours, c: live.category, la: fix?.lat, lo: fix?.lng, ac: fix?.acc })
    navigate(`/claim?t=${encodeURIComponent(token)}`, { replace: true })
  }

  return (
    <div className="stack gap-12" style={{ alignItems: 'center', maxWidth: 300 }}>
      <p style={{ fontSize: 15, opacity: 0.9 }}>เปิดกล้องไม่ได้ อนุญาตให้ใช้กล้องในการตั้งค่าเบราว์เซอร์ หรือเลือกรูป QR จากเครื่อง</p>
      <div className="row gap-8">
        <button className="btn btn-sm" style={{ background: '#fff', color: '#111' }} onClick={onPick}>
          เลือกรูป QR
        </button>
        {live && (
          <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.16)', color: '#fff' }} onClick={demo}>
            สแกนจำลอง
          </button>
        )}
      </div>
    </div>
  )
}
