import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import {
  ClockCountdownIcon,
  MapPinLineIcon,
  NavigationArrowIcon,
  QrCodeIcon,
  SealCheckIcon,
  TicketIcon,
  UserMinusIcon,
} from '@phosphor-icons/react'
import { useStore, isRegistered, myCredit } from '../../store'
import type { Activity, Credit, Student } from '../../data/types'
import { verifyToken } from '../../lib/qr'
import { allowedRadius, distanceM, getFix, RADIUS_M, type Fix, type GeoError } from '../../lib/geo'
import { haptic } from '../../lib/device'
import { CAT_LABEL, fmtDate, fmtHours, fmtTime } from '../../lib/format'
import { BackButton, CountUp, EASE_OUT, Empty, Page } from '../../ui/kit'
import { FIX_KEY } from './Scan'

type Fail =
  | { code: 'invalid' | 'expired' | 'not-registered' | 'geo-denied' | 'geo-other' }
  | { code: 'dup'; activityId: string }
  | { code: 'far'; meters: number }

type Stage = { s: 'checking' } | { s: 'locating' } | { s: 'fail'; fail: Fail } | { s: 'ok'; credit: Credit }

function cachedFix(): Fix | null {
  try {
    const f = JSON.parse(sessionStorage.getItem(FIX_KEY) ?? 'null') as Fix | null
    return f && Date.now() - f.at < 45_000 ? f : null
  } catch {
    return null
  }
}

export default function Claim() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const token = params.get('t') ?? ''
  const [stage, setStage] = useState<Stage>({ s: 'checking' })
  const ran = useRef(false)
  const me = useStore((s) => s.me)
  const students = useStore((s) => s.students)
  const activities = useStore((s) => s.activities)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      const st = useStore.getState()
      const v = verifyToken(token)
      await new Promise((r) => setTimeout(r, 450))
      if (!v.ok) return fail({ code: v.reason })
      const p = v.p
      const known = st.activities.find((a) => a.id === p.a)
      if (myCredit(st, p.a)) return fail({ code: 'dup', activityId: p.a })
      if (known && !isRegistered(st, p.a)) return fail({ code: 'not-registered' })

      let meters: number | undefined
      if (p.la != null && p.lo != null) {
        setStage({ s: 'locating' })
        let fix = cachedFix()
        if (!fix) {
          try {
            fix = await getFix()
          } catch (e) {
            return fail({ code: (e as GeoError) === 'denied' ? 'geo-denied' : 'geo-other' })
          }
        }
        meters = distanceM({ lat: p.la, lng: p.lo }, fix)
        if (meters > allowedRadius(p.ac, fix.acc)) return fail({ code: 'far', meters })
      }

      const credit: Credit = {
        activityId: p.a,
        studentId: st.me!,
        hours: p.h,
        category: p.c,
        title: known?.title ?? p.n,
        at: Date.now(),
        method: 'qr',
        distance: meters != null ? Math.round(meters) : undefined,
        ref: v.ref,
      }
      st.addCredit(credit)
      st.notify('credit', `ได้รับ ${fmtHours(p.h)} ชั่วโมง${CAT_LABEL[p.c]}`, credit.title, p.a)
      haptic.success()
      setStage({ s: 'ok', credit })
    })()

    function fail(f: Fail) {
      haptic.error()
      setStage({ s: 'fail', fail: f })
    }
  }, [token])

  return (
    <Page>
      <div className="pad safe-top stack" style={{ minHeight: '100%', paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}>
        <AnimatePresence mode="wait">
          {(stage.s === 'checking' || stage.s === 'locating') && (
            <motion.div
              key="wait"
              className="stack gap-20 grow"
              style={{ alignItems: 'center', justifyContent: 'center' }}
              exit={{ opacity: 0, filter: 'blur(6px)', transition: { duration: 0.18 } }}
            >
              <Spinner />
              <p className="t-h3">{stage.s === 'checking' ? 'กำลังตรวจสอบ QR' : 'กำลังยืนยันตำแหน่ง'}</p>
              <p className="t-meta" style={{ textAlign: 'center', maxWidth: 260 }}>
                {stage.s === 'checking' ? 'QR ของผู้คุมเปลี่ยนทุก 10 วินาที ระบบตรวจว่าเป็นรหัสล่าสุด' : `ต้องอยู่ในระยะ ${RADIUS_M} เมตรจากผู้คุมกิจกรรม`}
              </p>
            </motion.div>
          )}

          {stage.s === 'fail' && (
            <motion.div
              key="fail"
              className="stack grow"
              initial={{ opacity: 0, transform: 'translateY(16px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{ duration: 0.4, ease: EASE_OUT }}
            >
              <FailView fail={stage.fail} />
            </motion.div>
          )}

          {stage.s === 'ok' && (
            <motion.div key="ok" className="stack grow gap-24" style={{ paddingTop: 12 }}>
              <motion.h1
                className="t-title"
                style={{ textAlign: 'center' }}
                initial={{ opacity: 0, transform: 'translateY(8px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.5 }}
              >
                รับชั่วโมงสำเร็จ
              </motion.h1>
              <Ticket
                credit={stage.credit}
                activity={activities.find((a) => a.id === stage.credit.activityId)}
                student={me ? students[me] : undefined}
                fresh
              />
              <div className="grow" />
              <motion.div
                className="stack gap-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.9 }}
              >
                <button className="btn btn-ink btn-block" onClick={() => navigate('/', { replace: true })}>
                  เสร็จสิ้น
                </button>
                <button className="btn btn-ghost btn-block" onClick={() => navigate('/me', { replace: true })}>
                  ดู Transcript
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Page>
  )
}

function Spinner() {
  return (
    <motion.svg width="64" height="64" viewBox="0 0 64 64" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}>
      <circle cx="32" cy="32" r="26" stroke="var(--fill)" strokeWidth="6" fill="none" />
      <circle cx="32" cy="32" r="26" stroke="var(--accent)" strokeWidth="6" fill="none" strokeLinecap="round" strokeDasharray="50 200" />
    </motion.svg>
  )
}

function FailView({ fail }: { fail: Fail }) {
  const navigate = useNavigate()
  const copy: Record<Fail['code'], { icon: React.ReactNode; title: string; body: string }> = {
    invalid: { icon: <QrCodeIcon size={30} />, title: 'QR นี้ใช้รับชั่วโมงไม่ได้', body: 'QR ต้องมาจากหน้าจอของผู้คุมกิจกรรมใน NU Activity เท่านั้น' },
    expired: { icon: <ClockCountdownIcon size={30} />, title: 'QR หมดอายุแล้ว', body: 'QR ของผู้คุมเปลี่ยนทุก 10 วินาที สแกนจากหน้าจอของผู้คุมอีกครั้ง รูปถ่ายหรือภาพที่ส่งต่อกันมาใช้ไม่ได้' },
    'not-registered': { icon: <UserMinusIcon size={30} />, title: 'คุณยังไม่ได้ลงทะเบียนกิจกรรมนี้', body: 'แจ้งผู้คุมกิจกรรมให้เพิ่มชื่อของคุณในรายชื่อผู้เข้าร่วม แล้วผู้คุมจะให้ชั่วโมงได้จากเครื่องของเขา' },
    'geo-denied': { icon: <MapPinLineIcon size={30} />, title: 'อนุญาตให้ใช้ตำแหน่งก่อน', body: 'ระบบใช้ตำแหน่งเพื่อยืนยันว่าคุณอยู่ที่กิจกรรมจริง เปิดสิทธิ์ตำแหน่งให้เบราว์เซอร์ แล้วสแกนอีกครั้ง' },
    'geo-other': { icon: <MapPinLineIcon size={30} />, title: 'หาตำแหน่งไม่สำเร็จ', body: 'เปิด GPS หรือขยับไปที่โล่งขึ้น แล้วสแกนอีกครั้ง' },
    dup: { icon: <TicketIcon size={30} />, title: 'คุณรับชั่วโมงกิจกรรมนี้แล้ว', body: 'ชั่วโมงถูกบันทึกใน Transcript ของคุณเรียบร้อย ไม่ต้องสแกนซ้ำ' },
    far: {
      icon: <NavigationArrowIcon size={30} />,
      title: `คุณอยู่ห่างจากผู้คุม ${fail.code === 'far' ? Math.round(fail.meters).toLocaleString('th-TH') : ''} ม.`,
      body: `ต้องอยู่ในระยะ ${RADIUS_M} เมตรจากผู้คุมกิจกรรม เดินเข้าไปใกล้แล้วสแกนอีกครั้ง`,
    },
  }
  const c = copy[fail.code]
  return (
    <div className="stack grow" style={{ justifyContent: 'center' }}>
      <div className="stack gap-12" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="center" style={{ width: 72, height: 72, borderRadius: 99, background: 'var(--danger-soft)', color: 'var(--danger)' }}>
          {c.icon}
        </div>
        <h1 className="t-title mt-8" style={{ fontSize: 22 }}>
          {c.title}
        </h1>
        <p className="t-meta" style={{ maxWidth: 300 }}>
          {c.body}
        </p>
      </div>
      <div className="stack gap-8 mt-40">
        {fail.code === 'dup' ? (
          <button className="btn btn-ink btn-block" onClick={() => navigate(`/ticket/${fail.activityId}`, { replace: true })}>
            ดูบัตรยืนยัน
          </button>
        ) : (
          <button className="btn btn-ink btn-block" onClick={() => navigate('/scan', { replace: true })}>
            สแกนอีกครั้ง
          </button>
        )}
        <button className="btn btn-ghost btn-block" onClick={() => navigate('/', { replace: true })}>
          กลับหน้าแรก
        </button>
      </div>
    </div>
  )
}

export function Ticket({ credit, activity, student, fresh = false }: { credit: Credit; activity?: Activity; student?: Student; fresh?: boolean }) {
  return (
    <motion.div
      className="ticket"
      initial={fresh ? { opacity: 0, y: -60, rotate: -5, scale: 0.94 } : false}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ type: 'spring', duration: 0.9, bounce: 0.3, delay: 0.05 }}
    >
      <div className="ticket-top">
        {activity?.poster ? <img src={activity.poster} alt="" /> : <div style={{ height: '100%', background: 'var(--accent)' }} />}
        <div className="ticket-top-text">
          <div className="t-small t-strong" style={{ color: 'rgba(255,255,255,.85)' }}>
            {CAT_LABEL[credit.category]}
          </div>
          <div className="t-h3 clamp-2">{credit.title}</div>
        </div>
      </div>
      <div className="row between" style={{ padding: '18px 20px 6px', alignItems: 'flex-end' }}>
        <div className="stack">
          <span className="t-meta">ชั่วโมงที่ได้รับ</span>
          <span className="num" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, color: 'var(--accent)' }}>
            +{fresh ? <CountUp value={credit.hours} decimals={Number.isInteger(credit.hours) ? 0 : 1} delay={0.35} /> : fmtHours(credit.hours)}
          </span>
        </div>
        <motion.div
          initial={fresh ? { scale: 0.4, opacity: 0, rotate: -30 } : false}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.6, bounce: 0.45, delay: 0.7 }}
          style={{ color: 'var(--success)' }}
        >
          <SealCheckIcon size={52} weight="fill" />
        </motion.div>
      </div>
      <div className="ticket-perf">
        <i />
        <i />
      </div>
      <div className="ticket-grid" style={{ padding: '4px 20px 22px' }}>
        <Field label="ชื่อ" value={student?.name ?? '-'} />
        <Field label="รหัสนิสิต" value={credit.studentId} num />
        <Field label="วันที่" value={fmtDate(credit.at)} />
        <Field label="เวลายืนยัน" value={`${fmtTime(credit.at)} น.`} num />
        <Field
          label={credit.method === 'manual' ? 'ยืนยันโดย' : 'ระยะจากผู้คุม'}
          value={credit.method === 'manual' ? 'ผู้คุมกิจกรรม' : credit.distance != null ? `${credit.distance} ม.` : 'ไม่ได้ตรวจ'}
        />
        <Field label="เลขอ้างอิง" value={credit.ref ?? '-'} num />
      </div>
      {fresh && <div className="ticket-shine" />}
    </motion.div>
  )
}

function Field({ label, value, num }: { label: string; value: string; num?: boolean }) {
  return (
    <div className="stack" style={{ minWidth: 0 }}>
      <span className="t-small">{label}</span>
      <span className={`t-strong clamp-1 ${num ? 'num' : ''}`} style={{ fontSize: 15 }}>
        {value}
      </span>
    </div>
  )
}

export function TicketView() {
  const { id = '' } = useParams()
  const me = useStore((s) => s.me)
  const credits = useStore((s) => s.credits)
  const students = useStore((s) => s.students)
  const activities = useStore((s) => s.activities)
  const credit = credits.find((c) => c.activityId === id && c.studentId === me)
  return (
    <Page>
      <div className="safe-top pad" style={{ paddingBottom: 40 }}>
        <BackButton fallback="/me" />
        {credit ? (
          <div className="mt-16">
            <Ticket credit={credit} activity={activities.find((a) => a.id === id)} student={me ? students[me] : undefined} />
          </div>
        ) : (
          <Empty icon={<TicketIcon size={26} />} title="ยังไม่มีบัตรยืนยัน" body="บัตรจะขึ้นหลังจากสแกน QR ของผู้คุมกิจกรรมสำเร็จ" />
        )}
      </div>
    </Page>
  )
}
