import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { CalendarBlankIcon, ListBulletsIcon, QrCodeIcon } from '@phosphor-icons/react'
import { useStore, regCount } from '../../store'
import { Avatar, CountUp, EASE_OUT, Empty, Page, PosterCard } from '../../ui/kit'
import { fmtHours, fmtTime, phase } from '../../lib/format'
import { useNow, useSessionState } from '../../lib/hooks'
import { MonthCalendar, dayKey } from '../../ui/calendar'
import { isVisible } from '../../lib/stage'

const DAY = 24 * 3600_000

type When = 'all' | 'today' | 'tomorrow' | 'week' | 'weekend' | 'month'
const WHEN: [When, string][] = [
  ['all', 'ทุกวัน'],
  ['today', 'วันนี้'],
  ['tomorrow', 'พรุ่งนี้'],
  ['week', '7 วันนี้'],
  ['weekend', 'เสาร์-อาทิตย์'],
  ['month', 'เดือนนี้'],
]

function matchWhen(start: number, when: When, now: number) {
  if (when === 'all') return true
  const d0 = new Date(now)
  d0.setHours(0, 0, 0, 0)
  const day = Math.floor((start - d0.getTime()) / DAY)
  if (when === 'today') return day === 0
  if (when === 'tomorrow') return day === 1
  if (when === 'week') return day >= 0 && day < 7
  if (when === 'weekend') {
    const w = new Date(start).getDay()
    return day >= 0 && day < 14 && (w === 0 || w === 6)
  }
  const s = new Date(start)
  return s.getMonth() === d0.getMonth() && s.getFullYear() === d0.getFullYear()
}
/** Activities starting within this many days are listed under "ใกล้ถึงวัน". */
const SOON_DAYS = 3

export default function Home() {
  const navigate = useNavigate()
  const me = useStore((s) => s.me)
  const students = useStore((s) => s.students)
  const activities = useStore((s) => s.activities)
  const registrations = useStore((s) => s.registrations)
  const credits = useStore((s) => s.credits)
  const extraReg = useStore((s) => s.extraReg)
  const [view, setView] = useSessionState<'list' | 'cal'>('home-view', 'list')
  const [when, setWhen] = useSessionState<When>('home-when', 'all')
  const [seatsOnly, setSeatsOnly] = useSessionState('home-seats', false)
  const now = useNow()
  const [month, setMonth] = useState(() => Date.now())
  const [day, setDay] = useState<string | null>(() => dayKey(Date.now()))

  const student = me ? students[me] : undefined
  const firstName = student?.name.split(' ')[0] ?? ''

  const { total, live, feed, groups } = useMemo(() => {
    const myCredits = credits.filter((c) => c.studentId === me)
    const total = myCredits.reduce((t, c) => t + c.hours, 0)
    const mine = new Set(registrations.filter((r) => r.studentId === me).map((r) => r.activityId))
    const credited = new Set(myCredits.map((c) => c.activityId))
    const live = activities.find((a) => phase(a, now) === 'live' && mine.has(a.id) && !credited.has(a.id))
    const feed = activities
      .filter((a) => a.end > now && (isVisible(a, now) || mine.has(a.id)))
      .filter((a) => view === 'cal' || matchWhen(a.start, when, now))
      .sort((a, b) => a.start - b.start)
      .map((a) => ({
        a,
        registered: mine.has(a.id),
        credited: credited.has(a.id),
        seatsLeft: a.capacity - regCount({ registrations, extraReg }, a.id),
      }))
    if (seatsOnly) feed.splice(0, feed.length, ...feed.filter((f) => f.seatsLeft > 0 || f.registered))
    // three groups: starting soon, open as usual, not open for registration yet
    const notYet = feed.filter((f) => f.a.opensAt && now < f.a.opensAt)
    const rest = feed.filter((f) => !notYet.includes(f))
    const soon = rest.filter((f) => f.a.start - now < SOON_DAYS * DAY)
    const open = rest.filter((f) => !soon.includes(f))
    return { total, live, feed, groups: { soon, open, notYet } }
  }, [activities, registrations, credits, extraReg, me, now, when, seatsOnly, view])

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
              <span className="t-meta">ชั่วโมงจิตอาสาสะสม</span>
              <div className="row gap-6" style={{ alignItems: 'baseline' }}>
                <span className="num" style={{ fontSize: 44, fontWeight: 700, lineHeight: 1.05 }}>
                  <CountUp value={total} decimals={Number.isInteger(total) ? 0 : 1} />
                </span>
                <span className="t-meta t-strong">ชั่วโมง</span>
              </div>
            </div>
            <span className="t-small">ดู Transcript</span>
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
            กิจกรรมจิตอาสา
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
        <div className="filter-row" role="group" aria-label="กรองกิจกรรม">
          {view === 'list' &&
            WHEN.map(([k, label]) => (
              <button key={k} className={`chip press ${when === k ? 'ink' : ''}`} onClick={() => setWhen(k)} aria-pressed={when === k}>
                {label}
              </button>
            ))}
          <button className={`chip press ${seatsOnly ? 'ink' : ''}`} onClick={() => setSeatsOnly(!seatsOnly)} aria-pressed={seatsOnly}>
            ยังมีที่ว่าง
          </button>
        </div>
        {view === 'list' && (when !== 'all' || seatsOnly) && (
          <p className="t-small mt-8">
            พบ {feed.length} กิจกรรม{' '}
            <button
              className="t-accent t-strong"
              onClick={() => {
                setWhen('all')
                setSeatsOnly(false)
              }}
            >
              ล้างตัวกรอง
            </button>
          </p>
        )}

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

        <div style={view === 'cal' ? { display: 'none' } : undefined}>
          {(
            [
              ['ใกล้ถึงวัน', `เริ่มภายใน ${SOON_DAYS} วัน`, groups.soon],
              ['เปิดรับสมัคร', '', groups.open],
              ['ยังไม่เปิดรับ', 'กดเข้าไปตั้งเตือนได้', groups.notYet],
            ] as const
          ).map(([title, sub, list]) =>
            list.length ? (
              <section key={title} className="mt-24">
                <div className="row between" style={{ alignItems: 'baseline' }}>
                  <h3 className="t-h3">
                    {title} <span className="t-faint num">{list.length}</span>
                  </h3>
                  {sub && <span className="t-small">{sub}</span>}
                </div>
                <div className="stack gap-32 mt-16">
                  {list.map((f, i) => (
                    <PosterCard key={f.a.id} index={i} a={f.a} registered={f.registered} credited={f.credited} seatsLeft={f.seatsLeft} />
                  ))}
                </div>
              </section>
            ) : null,
          )}
          {feed.length === 0 && (
            <Empty icon={<CalendarBlankIcon size={26} />} title={when !== 'all' || seatsOnly ? 'ไม่พบกิจกรรมตามตัวกรอง' : 'ยังไม่มีกิจกรรมเปิดรับ'} body={when !== 'all' || seatsOnly ? 'ลองเลือกวันอื่น หรือล้างตัวกรอง' : 'เปิดการแจ้งเตือนไว้ แล้วเราจะบอกทันทีเมื่อมีกิจกรรมใหม่'} />
          )}
        </div>
      </div>
    </Page>
  )
}
