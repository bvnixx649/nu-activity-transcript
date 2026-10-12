import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import QRCode from 'qrcode'
import { CrosshairIcon, MapPinIcon, WarningCircleIcon, XIcon } from '@phosphor-icons/react'
import { useStore } from '../../store'
import { claimUrl, makeToken, WINDOW_MS, windowOf } from '../../lib/qr'
import { RADIUS_M, watchFix, type Fix, type GeoError } from '../../lib/geo'
import { haptic, keepAwake } from '../../lib/device'
import { fmtHours, fmtTime } from '../../lib/format'
import { EASE_OUT, Switch } from '../../ui/kit'

export default function Presenter() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const a = useStore((s) => s.activities.find((x) => x.id === id))
  const registrations = useStore((s) => s.registrations)
  const credits = useStore((s) => s.credits)
  const students = useStore((s) => s.students)
  const me = useStore((s) => s.me)
  const addCredit = useStore((s) => s.addCredit)
  const [win, setWin] = useState(windowOf())
  const [svg, setSvg] = useState('')
  const [fix, setFix] = useState<Fix | null>(null)
  const [geoErr, setGeoErr] = useState<GeoError | null>(null)
  const [simulate, setSimulate] = useState(true)

  // QR is for a bright screen in a bright room
  useEffect(() => {
    document.documentElement.classList.add('force-light')
    let release = () => {}
    keepAwake().then((r) => (release = r))
    return () => {
      document.documentElement.classList.remove('force-light')
      release()
    }
  }, [])

  useEffect(() => watchFix(setFix, setGeoErr), [])

  // tick exactly on window boundaries
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const loop = () => {
      setWin(windowOf())
      t = setTimeout(loop, WINDOW_MS - (Date.now() % WINDOW_MS) + 20)
    }
    t = setTimeout(loop, WINDOW_MS - (Date.now() % WINDOW_MS) + 20)
    return () => clearTimeout(t)
  }, [])

  const fixKey = fix ? `${fix.lat.toFixed(5)},${fix.lng.toFixed(5)},${Math.round(fix.acc)}` : ''
  useEffect(() => {
    if (!a) return
    const token = makeToken(
      {
        a: a.id,
        n: a.title.slice(0, 20),
        h: a.hours,
        c: a.category,
        la: fix ? +fix.lat.toFixed(5) : undefined,
        lo: fix ? +fix.lng.toFixed(5) : undefined,
        ac: fix ? Math.round(fix.acc) : undefined,
      },
      win * WINDOW_MS + 1,
    )
    QRCode.toString(claimUrl(token), {
      type: 'svg',
      margin: 0,
      errorCorrectionLevel: 'L',
      color: { dark: '#16161aff', light: '#ffffffff' },
    }).then(setSvg)
  }, [a, win, fixKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const { done, total, recent } = useMemo(() => {
    const regs = registrations.filter((r) => r.activityId === id)
    const cr = credits.filter((c) => c.activityId === id).sort((x, y) => y.at - x.at)
    return { done: cr.length, total: regs.length, recent: cr.slice(0, 4) }
  }, [registrations, credits, id])

  // demo: registered students trickle in as if scanning from their own phones
  useEffect(() => {
    if (!simulate || !a) return
    let t: ReturnType<typeof setTimeout>
    const step = () => {
      const st = useStore.getState()
      const creditedIds = new Set(st.credits.filter((c) => c.activityId === a.id).map((c) => c.studentId))
      const next = st.registrations.find((r) => r.activityId === a.id && r.studentId !== me && !creditedIds.has(r.studentId))
      if (next) {
        addCredit({
          activityId: a.id,
          studentId: next.studentId,
          hours: a.hours,
          category: a.category,
          title: a.title,
          at: Date.now(),
          method: 'qr',
          distance: 6 + Math.round(Math.random() * 70),
        })
        haptic.tap()
      }
      t = setTimeout(step, 1800 + Math.random() * 2600)
    }
    t = setTimeout(step, 2200)
    return () => clearTimeout(t)
  }, [simulate, a, me, addCredit])

  if (!a) return null

  return (
    <div className="presenter page stack" style={{ padding: 'calc(var(--safe-top) + 10px) 20px calc(var(--safe-bottom) + 20px)' }}>
      <div className="row between">
        <button className="icon-btn" onClick={() => navigate(-1)} aria-label="ปิด QR">
          <XIcon size={20} weight="bold" />
        </button>
        <span className="t-small t-strong row gap-6" style={{ color: '#16161a' }}>
          <span className="dot-live" /> เปิดรับชั่วโมงอยู่
        </span>
        <span style={{ width: 40 }} />
      </div>

      <div className="stack gap-4 mt-16" style={{ textAlign: 'center' }}>
        <h1 className="t-title" style={{ fontSize: 24 }}>
          สแกนเพื่อรับ {fmtHours(a.hours)} ชั่วโมง
        </h1>
        <p className="t-meta clamp-2">{a.title}</p>
      </div>

      <div className="mt-24">
        <div className="qr-box">
          <AnimatePresence initial={false}>
            <motion.div
              key={svg.length + ':' + win}
              style={{ position: 'absolute', inset: 0 }}
              initial={{ opacity: 0, filter: 'blur(6px)', transform: 'scale(0.985)' }}
              animate={{ opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }}
              exit={{ opacity: 0, filter: 'blur(6px)' }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </AnimatePresence>
        </div>
        <div className="qr-timer mt-20" style={{ width: 'min(78vw, 340px)', margin: '20px auto 0' }}>
          <i key={win} style={{ animation: `qrTimer ${WINDOW_MS - (Date.now() % WINDOW_MS)}ms linear forwards` }} />
        </div>
        <p className="t-small mt-8" style={{ textAlign: 'center', color: '#55555f' }}>
          QR เปลี่ยนทุก 10 วินาที ถ่ายรูปส่งต่อกันใช้ไม่ได้
        </p>
      </div>

      <div className="row gap-8 mt-12" style={{ justifyContent: 'center', color: '#55555f' }}>
        {fix ? (
          <span className="t-small row gap-6">
            <MapPinIcon size={16} weight="fill" color="#17914f" /> ตรวจระยะ {RADIUS_M} ม. จากเครื่องนี้ แม่นยำ ±{Math.round(fix.acc)} ม.
          </span>
        ) : geoErr ? (
          <span className="t-small row gap-6">
            <WarningCircleIcon size={16} weight="fill" color="#d33a2c" /> เปิดตำแหน่งเพื่อให้ระบบตรวจระยะนิสิต
          </span>
        ) : (
          <span className="t-small row gap-6">
            <CrosshairIcon size={16} /> กำลังหาตำแหน่งของคุณ
          </span>
        )}
      </div>

      <div className="grow" />

      <div className="stack gap-12 mt-24" style={{ background: '#f4f4f6', borderRadius: 22, padding: 16 }}>
        <div className="row between">
          <div className="row gap-6" style={{ alignItems: 'baseline' }}>
            <motion.span
              key={done}
              className="num"
              style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, display: 'inline-block' }}
              initial={{ transform: 'translateY(6px)', opacity: 0.4 }}
              animate={{ transform: 'translateY(0px)', opacity: 1 }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.35 }}
            >
              {done}
            </motion.span>
            <span className="t-meta">/ {total} คนได้รับชั่วโมงแล้ว</span>
          </div>
        </div>
        <div className="stack" style={{ minHeight: 4 * 30 }}>
          <AnimatePresence initial={false}>
            {recent.map((c) => (
              <motion.div
                key={c.studentId}
                layout
                className="row between"
                style={{ height: 30 }}
                initial={{ opacity: 0, transform: 'translateY(-10px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <span className="clamp-1" style={{ fontSize: 15 }}>
                  {students[c.studentId]?.name ?? c.studentId}
                </span>
                <span className="t-small num" style={{ color: '#55555f', flex: 'none' }}>
                  {fmtTime(c.at)} น.
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="row between" style={{ borderTop: '1px solid rgba(0,0,0,.08)', paddingTop: 12 }}>
          <span className="t-small" style={{ color: '#55555f' }}>
            จำลองนิสิตสแกนจากเครื่องอื่น
          </span>
          <Switch label="จำลองนิสิตสแกน" checked={simulate} onChange={setSimulate} />
        </div>
      </div>
    </div>
  )
}
