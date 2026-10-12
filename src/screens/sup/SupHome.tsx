import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowsLeftRightIcon, CaretRightIcon, PlusIcon, QrCodeIcon, SignOutIcon } from '@phosphor-icons/react'
import { useStore, regCount } from '../../store'
import type { Activity } from '../../data/types'
import { EASE_OUT, Page, Sheet } from '../../ui/kit'
import { fmtDay, fmtHours, fmtTime, phase } from '../../lib/format'
import { useNow } from '../../lib/hooks'

export default function SupHome() {
  const navigate = useNavigate()
  const sup = useStore((s) => s.sup)
  const me = useStore((s) => s.me)
  const activities = useStore((s) => s.activities)
  const registrations = useStore((s) => s.registrations)
  const extraReg = useStore((s) => s.extraReg)
  const credits = useStore((s) => s.credits)
  const setMode = useStore((s) => s.setMode)
  const supLogout = useStore((s) => s.supLogout)
  const [menu, setMenu] = useState(false)
  const now = useNow()

  const data = useMemo(() => {
    const mine = activities.filter((a) => a.orgCode === sup?.code)
    const count = (a: Activity) => regCount({ registrations, extraReg }, a.id)
    const issued = credits.filter((c) => mine.some((a) => a.id === c.activityId)).reduce((s, c) => s + c.hours, 0)
    return {
      count,
      live: mine.filter((a) => phase(a, now) === 'live'),
      upcoming: mine.filter((a) => phase(a, now) === 'upcoming').sort((a, b) => a.start - b.start),
      ended: mine.filter((a) => phase(a, now) === 'ended').sort((a, b) => b.start - a.start),
      open: mine.filter((a) => a.end > now).length,
      people: mine.filter((a) => a.end > now).reduce((s, a) => s + count(a), 0),
      issued,
    }
  }, [activities, registrations, extraReg, credits, sup, now])

  if (!sup) return null

  return (
    <Page memoryKey="sup">
      <div className="pad safe-top" style={{ paddingBottom: 48 }}>
        <div className="row between gap-12" style={{ minHeight: 48 }}>
          <div className="stack" style={{ minWidth: 0 }}>
            <h1 className="t-title clamp-1" style={{ fontSize: 22 }}>
              {sup.org}
            </h1>
            <span className="t-small">ผู้คุมกิจกรรม {sup.name}</span>
          </div>
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="สลับโหมด">
            <ArrowsLeftRightIcon size={20} />
          </button>
        </div>

        <div className="row gap-10 mt-20">
          <Stat label="เปิดรับอยู่" value={data.open} />
          <Stat label="ผู้ลงทะเบียน" value={data.people} />
          <Stat label="ชั่วโมงที่ออกให้" value={fmtHours(data.issued)} />
        </div>

        <button className="btn btn-ink btn-block mt-16" onClick={() => navigate('/sup/new')}>
          <PlusIcon size={20} weight="bold" /> สร้างกิจกรรม
        </button>

        {data.live.length > 0 && (
          <Section title="กำลังดำเนินอยู่">
            {data.live.map((a, i) => (
              <SupRow key={a.id} a={a} i={i} count={data.count(a)} live onQr={() => navigate(`/sup/a/${a.id}/qr`)} />
            ))}
          </Section>
        )}
        <Section title="กำลังจะมาถึง">
          {data.upcoming.length === 0 && <p className="t-meta">ยังไม่มีกิจกรรมที่กำลังจะมาถึง</p>}
          {data.upcoming.map((a, i) => (
            <SupRow key={a.id} a={a} i={i} count={data.count(a)} />
          ))}
        </Section>
        {data.ended.length > 0 && (
          <Section title="จบแล้ว">
            {data.ended.map((a, i) => (
              <SupRow key={a.id} a={a} i={i} count={data.count(a)} />
            ))}
          </Section>
        )}
      </div>

      <Sheet open={menu} onClose={() => setMenu(false)}>
        <div className="stack gap-8">
          <button
            className="btn btn-soft btn-block"
            onClick={() => {
              setMenu(false)
              setMode('student')
              navigate(me ? '/' : '/welcome', { replace: true })
            }}
          >
            <ArrowsLeftRightIcon size={18} /> สลับไปโหมดนิสิต
          </button>
          <button
            className="btn btn-danger-soft btn-block"
            onClick={() => {
              setMenu(false)
              supLogout()
              navigate(me ? '/me' : '/welcome', { replace: true })
            }}
          >
            <SignOutIcon size={18} /> ออกจากโหมดผู้คุม
          </button>
        </div>
      </Sheet>
    </Page>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card stack grow" style={{ padding: '14px 14px 12px' }}>
      <span className="num" style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.2 }}>
        {value}
      </span>
      <span className="t-small">{label}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-32">
      <h2 className="t-h3">{title}</h2>
      <div className="stack gap-10 mt-12">{children}</div>
    </section>
  )
}

function SupRow({ a, i, count, live, onQr }: { a: Activity; i: number; count: number; live?: boolean; onQr?: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(i, 6) * 0.04 }}
    >
      <Link to={`/sup/a/${a.id}`} className="card row press" style={{ padding: 12, gap: 14 }}>
        <img src={a.poster} alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', flex: 'none' }} />
        <div className="stack grow" style={{ minWidth: 0 }}>
          <span className="t-strong clamp-1">{a.title}</span>
          <span className="t-small">
            {fmtDay(a.start)} {fmtTime(a.start)} น.
          </span>
          <span className="t-small">
            ลงทะเบียน <b className="num">{count}</b>/<span className="num">{a.capacity}</span>
          </span>
        </div>
        {live ? (
          <button
            className="btn btn-accent btn-xs"
            onClick={(e) => {
              e.preventDefault()
              onQr?.()
            }}
          >
            <QrCodeIcon size={16} weight="bold" /> เปิด QR
          </button>
        ) : (
          <CaretRightIcon size={18} className="t-faint" />
        )}
      </Link>
    </motion.div>
  )
}
