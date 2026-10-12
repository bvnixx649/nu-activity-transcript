import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarBlankIcon, QrCodeIcon, TicketIcon } from '@phosphor-icons/react'
import { useStore } from '../../store'
import type { Activity, Credit } from '../../data/types'
import { EASE_OUT, Empty, Page, Segmented } from '../../ui/kit'
import { fmtDay, fmtHours, fmtTime, phase, relDay } from '../../lib/format'
import { useNow, useSessionState } from '../../lib/hooks'

export default function Mine() {
  const navigate = useNavigate()
  const me = useStore((s) => s.me)
  const activities = useStore((s) => s.activities)
  const registrations = useStore((s) => s.registrations)
  const credits = useStore((s) => s.credits)
  const [tab, setTab] = useSessionState<'upcoming' | 'past'>('mine-tab', 'upcoming')
  const now = useNow()

  const { upcoming, past } = useMemo(() => {
    const regIds = new Set(registrations.filter((r) => r.studentId === me).map((r) => r.activityId))
    const myCredits = new Map(credits.filter((c) => c.studentId === me).map((c) => [c.activityId, c]))
    const mine = activities.filter((a) => regIds.has(a.id) || myCredits.has(a.id))
    return {
      upcoming: mine.filter((a) => a.end > now && !myCredits.has(a.id)).sort((a, b) => a.start - b.start),
      past: mine
        .filter((a) => a.end <= now || myCredits.has(a.id))
        .sort((a, b) => b.start - a.start)
        .map((a) => ({ a, credit: myCredits.get(a.id) })),
    }
  }, [activities, registrations, credits, me, now])

  return (
    <Page tabbar memoryKey="mine">
      <div className="pad safe-top">
        <h1 className="t-title" style={{ minHeight: 48, display: 'flex', alignItems: 'center' }}>
          กิจกรรมของฉัน
        </h1>
        <div className="mt-12">
          <Segmented
            id="mine"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'upcoming', label: `กำลังจะถึง ${upcoming.length || ''}` },
              { value: 'past', label: 'ที่ผ่านมา' },
            ]}
          />
        </div>

        <div className="stack gap-12 mt-20">
          {tab === 'upcoming' &&
            (upcoming.length ? (
              upcoming.map((a, i) => <UpcomingRow key={a.id} a={a} i={i} now={now} onScan={() => navigate('/scan')} />)
            ) : (
              <Empty
                icon={<CalendarBlankIcon size={26} />}
                title="ยังไม่มีกิจกรรมที่ลงทะเบียน"
                body="เลือกกิจกรรมที่สนใจจากหน้าแรก ลงทะเบียนแล้วจะขึ้นที่นี่"
                action={
                  <Link className="btn btn-soft btn-sm" to="/">
                    ดูกิจกรรมที่เปิดรับ
                  </Link>
                }
              />
            ))}
          {tab === 'past' &&
            (past.length ? (
              past.map(({ a, credit }, i) => <PastRow key={a.id} a={a} credit={credit} i={i} />)
            ) : (
              <Empty icon={<TicketIcon size={26} />} title="ยังไม่มีกิจกรรมที่ผ่านมา" />
            ))}
        </div>
      </div>
    </Page>
  )
}

function Row({ a, i, children }: { a: Activity; i: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(10px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(i, 8) * 0.04 }}
    >
      <Link to={`/a/${a.id}`} className="card row gap-14 press" style={{ padding: 12, gap: 14 }}>
        <img src={a.poster} alt="" style={{ width: 76, height: 76, borderRadius: 16, objectFit: 'cover', flex: 'none' }} />
        <div className="stack grow gap-4">{children}</div>
      </Link>
    </motion.div>
  )
}

function UpcomingRow({ a, i, now, onScan }: { a: Activity; i: number; now: number; onScan: () => void }) {
  const live = phase(a, now) === 'live'
  return (
    <Row a={a} i={i}>
      <span className="t-small t-strong t-accent row gap-6">
        {live ? (
          <>
            <span className="dot-live" /> กำลังดำเนินอยู่
          </>
        ) : (
          `${relDay(a.start, now)} ${fmtTime(a.start)} น.`
        )}
      </span>
      <span className="t-strong clamp-2" style={{ lineHeight: 1.4 }}>
        {a.title}
      </span>
      {live ? (
        <button
          className="btn btn-accent btn-xs mt-4"
          style={{ alignSelf: 'flex-start' }}
          onClick={(e) => {
            e.preventDefault()
            onScan()
          }}
        >
          <QrCodeIcon size={16} weight="bold" /> สแกนรับชั่วโมง
        </button>
      ) : (
        <span className="t-small clamp-1">
          {fmtDay(a.start)} {a.place}
        </span>
      )}
    </Row>
  )
}

function PastRow({ a, credit, i }: { a: Activity; credit?: Credit; i: number }) {
  return (
    <Row a={a} i={i}>
      <span className="t-small">{fmtDay(a.start)}</span>
      <span className="t-strong clamp-2" style={{ lineHeight: 1.4 }}>
        {a.title}
      </span>
      {credit ? (
        <span className="t-small t-strong t-success">+{fmtHours(credit.hours)} ชั่วโมง</span>
      ) : (
        <span className="t-small t-faint">ไม่ได้รับชั่วโมง</span>
      )}
    </Row>
  )
}
