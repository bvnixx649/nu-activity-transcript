import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarBlankIcon, ListBulletsIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useStore, regCount } from '../../store'
import type { Category } from '../../data/types'
import { Avatar, CountUp, EASE_OUT, Empty, Page, PosterCard, Segmented } from '../../ui/kit'
import { fmtHours, fmtTime, phase } from '../../lib/format'
import { useNow, useSessionState } from '../../lib/hooks'
import { MonthCalendar, dayKey } from '../../ui/calendar'

type Filter = 'all' | Category

export default function Home() {
  const navigate = useNavigate()
  const me = useStore((s) => s.me)
  const students = useStore((s) => s.students)
  const activities = useStore((s) => s.activities)
  const registrations = useStore((s) => s.registrations)
  const credits = useStore((s) => s.credits)
  const extraReg = useStore((s) => s.extraReg)
  const [filter, setFilter] = useSessionState<Filter>('home-filter', 'all')
  const [view, setView] = useSessionState<'list' | 'cal'>('home-view', 'list')
  const now = useNow()
  const [month, setMonth] = useState(() => Date.now())
  const [day, setDay] = useState<string | null>(() => dayKey(Date.now()))

  const student = me ? students[me] : undefined
  const firstName = student?.name.split(' ')[0] ?? ''

  const { totals, live, feed, mine } = useMemo(() => {
    const myCredits = credits.filter((c) => c.studentId === me)
    const totals = { volunteer: 0, faculty: 0 }
    myCredits.forEach((c) => (totals[c.category] += c.hours))
    const mine = new Set(registrations.filter((r) => r.studentId === me).map((r) => r.activityId))
    const credited = new Set(myCredits.map((c) => c.activityId))
    const live = activities.find((a) => phase(a, now) === 'live' && mine.has(a.id) && !credited.has(a.id))
    const feed = activities
      .filter((a) => a.end > now && (filter === 'all' || a.category === filter))
      .sort((a, b) => a.start - b.start)
      .map((a) => ({
        a,
        registered: mine.has(a.id),
        credited: credited.has(a.id),
        seatsLeft: a.capacity - regCount({ registrations, extraReg }, a.id),
      }))
    return { totals, live, feed, mine }
  }, [activities, registrations, credits, extraReg, me, now, filter])

  const total = totals.volunteer + totals.faculty
  void mine

  return (
    <Page tabbar memoryKey="home">
      <div className="pad safe-top">
        <div className="row between" style={{ minHeight: 48 }}>
          <h1 className="t-title">สวัสดี {firstName}</h1>
          <Link to="/me" aria-label="โปรไฟล์" className="press">
            <Avatar name={student?.name ?? '?'} size={40} />
          </Link>
        </div>

        <Link to="/me" className="card hours-card stack gap-16 mt-16 press" style={{ display: 'flex' }}>
          <div className="row between" style={{ alignItems: 'flex-end' }}>
            <div className="stack">
              <span className="t-meta">ชั่วโมงกิจกรรมสะสม</span>
              <div className="row gap-6" style={{ alignItems: 'baseline' }}>
                <span className="num" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.05 }}>
                  <CountUp value={total} decimals={Number.isInteger(total) ? 0 : 1} />
                </span>
                <span className="t-meta t-strong">ชั่วโมง</span>
              </div>
            </div>
            <span className="t-small">ดู Transcript</span>
          </div>
          <div className="stack gap-10">
            <div className="hours-split">
              {total === 0 ? (
                <i style={{ flex: 1, background: 'var(--fill)' }} />
              ) : (
                <>
                  {totals.volunteer > 0 && (
                    <motion.i
                      initial={{ flexGrow: 0.0001 }}
                      animate={{ flexGrow: totals.volunteer }}
                      transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.1 }}
                      style={{ background: 'var(--accent)', flexBasis: 0 }}
                    />
                  )}
                  {totals.faculty > 0 && (
                    <motion.i
                      initial={{ flexGrow: 0.0001 }}
                      animate={{ flexGrow: totals.faculty }}
                      transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.2 }}
                      style={{ background: 'var(--grey)', flexBasis: 0 }}
                    />
                  )}
                </>
              )}
            </div>
            <div className="row gap-16 t-small">
              <span className="row gap-6">
                <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--accent)' }} />
                จิตอาสา <b className="num">{fmtHours(totals.volunteer)}</b>
              </span>
              <span className="row gap-6">
                <i style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--grey)' }} />
                กิจกรรมคณะ <b className="num">{fmtHours(totals.faculty)}</b>
              </span>
            </div>
          </div>
        </Link>

        {live && (
          <motion.div
            className="now-card mt-12"
            initial={{ opacity: 0, transform: 'translateY(10px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }}
          >
            <div className="row gap-8 t-small t-strong" style={{ color: 'inherit' }}>
              <span className="dot-live" />
              กำลังดำเนินอยู่ ถึง {fmtTime(live.end)} น.
            </div>
            <Link to={`/a/${live.id}`} className="t-h3 clamp-2 mt-8" style={{ display: 'block' }}>
              {live.title}
            </Link>
            <p className="t-meta mt-4">จบกิจกรรมแล้วสแกน QR จากผู้คุมเพื่อรับ {fmtHours(live.hours)} ชั่วโมง</p>
            <button className="btn btn-accent btn-block mt-16" onClick={() => navigate('/scan')}>
              <QrCodeIcon size={20} weight="bold" />
              สแกนรับชั่วโมง
            </button>
          </motion.div>
        )}

        <div className="row between mt-32">
          <h2 className="t-title" style={{ fontSize: 22 }}>
            กิจกรรมที่เปิดรับ
          </h2>
          <div className="view-toggle" role="group" aria-label="รูปแบบการแสดง">
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')} aria-label="ดูเป็นรายการ" aria-pressed={view === 'list'}>
              <ListBulletsIcon size={20} weight="bold" />
            </button>
            <button className={view === 'cal' ? 'on' : ''} onClick={() => setView('cal')} aria-label="ดูเป็นปฏิทิน" aria-pressed={view === 'cal'}>
              <CalendarBlankIcon size={20} weight="bold" />
            </button>
          </div>
        </div>
        <div className="mt-12">
          <Segmented
            id="home-cat"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'ทั้งหมด' },
              { value: 'volunteer', label: 'จิตอาสา' },
              { value: 'faculty', label: 'กิจกรรมคณะ' },
            ]}
          />
        </div>

        {view === 'cal' && (
          <div className="stack gap-20 mt-20">
            <MonthCalendar activities={feed.map((f) => f.a)} month={month} onMonth={setMonth} selected={day} onSelect={setDay} now={now} />
            {(() => {
              const list = day ? feed.filter((f) => dayKey(f.a.start) === day) : []
              if (!day) return <p className="t-meta">แตะวันที่เพื่อดูกิจกรรม</p>
              if (!list.length) return <p className="t-meta">ไม่มีกิจกรรมที่เปิดรับในวันที่เลือก</p>
              return list.map((f, i) => (
                <PosterCard key={f.a.id} index={i} a={f.a} registered={f.registered} credited={f.credited} seatsLeft={f.seatsLeft} />
              ))
            })()}
          </div>
        )}

        <div className="stack gap-32 mt-20" style={view === 'cal' ? { display: 'none' } : undefined}>
          {feed.map((f, i) => (
            <PosterCard key={f.a.id} index={i} a={f.a} registered={f.registered} credited={f.credited} seatsLeft={f.seatsLeft} />
          ))}
          {feed.length === 0 && (
            <Empty icon={<CalendarBlankIcon size={26} />} title="ยังไม่มีกิจกรรมเปิดรับ" body="เปิดการแจ้งเตือนไว้ แล้วเราจะบอกทันทีเมื่อมีกิจกรรมใหม่" />
          )}
        </div>
      </div>
    </Page>
  )
}
