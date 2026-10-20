import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import {
  ArrowsLeftRightIcon,
  CaretRightIcon,
  ChatTeardropTextIcon,
  CheckCircleIcon,
  EyeSlashIcon,
  ListChecksIcon,
  PaperPlaneTiltIcon,
  PlusIcon,
  QrCodeIcon,
  SignOutIcon,
} from '@phosphor-icons/react'
import { useStore, regCount } from '../../store'
import type { Activity } from '../../data/types'
import { EASE_OUT, Page, Sheet } from '../../ui/kit'
import { MonthCalendar, dayKey } from '../../ui/calendar'
import { StageMini } from '../../ui/stage'
import { YearStats } from '../../ui/stats'
import { fmtDay, fmtTime } from '../../lib/format'
import { useNow } from '../../lib/hooks'
import { AUTO_CLOSE_H } from '../../config'
import { daysToSubmit, isVisible, stage, type Stage } from '../../lib/stage'

const H = 3600_000

interface Todo {
  a: Activity
  icon: ReactNode
  title: string
  body: string
  action: string
  to: string
  urgent?: boolean
}

export default function SupHome() {
  const navigate = useNavigate()
  const sup = useStore((s) => s.sup)
  const me = useStore((s) => s.me)
  const activities = useStore((s) => s.activities)
  const registrations = useStore((s) => s.registrations)
  const extraReg = useStore((s) => s.extraReg)
  const credits = useStore((s) => s.credits)
  const dms = useStore((s) => s.dms)
  const students = useStore((s) => s.students)
  const setMode = useStore((s) => s.setMode)
  const supLogout = useStore((s) => s.supLogout)
  const [menu, setMenu] = useState(false)
  const [month, setMonth] = useState(() => Date.now())
  const [day, setDay] = useState<string | null>(null)
  const [showDone, setShowDone] = useState(false)
  const now = useNow()

  const data = useMemo(() => {
    const mine = activities.filter((a) => a.orgCode === sup?.code)
    const withStage = mine.map((a) => ({ a, s: stage(a, now) }))
    const unscanned = (a: Activity) =>
      registrations.filter((r) => r.activityId === a.id).length -
      credits.filter((c) => c.activityId === a.id).length

    const todos: Todo[] = []
    withStage.forEach(({ a, s }) => {
      if (s === 'live')
        todos.push({
          a,
          icon: <QrCodeIcon size={22} weight="bold" />,
          title: 'กำลังจัดอยู่ตอนนี้',
          body: `เปิด QR ให้นิสิตสแกนก่อนกลับ จบ ${fmtTime(a.end)} น.`,
          action: 'เปิด QR',
          to: `/sup/a/${a.id}/qr`,
        })
      if (s === 'closing') {
        const left = Math.max(1, Math.ceil((a.end + AUTO_CLOSE_H * H - now) / H))
        todos.push({
          a,
          icon: <ListChecksIcon size={22} weight="bold" />,
          title: 'ตรวจและปิดรายชื่อ',
          body: `ยังไม่สแกน ${unscanned(a)} คน ระบบจะปิดให้เองในอีก ${left} ชม.`,
          action: 'ตรวจรายชื่อ',
          to: `/sup/a/${a.id}`,
          urgent: true,
        })
      }
      if (s === 'submit') {
        const d = daysToSubmit(a, now)
        todos.push({
          a,
          icon: <PaperPlaneTiltIcon size={22} weight="bold" />,
          title: 'ส่งรายชื่อให้ศูนย์จิตอาสา',
          body: d >= 0 ? `ต้องส่งภายใน ${d} วัน` : `เลยกำหนดส่งมา ${-d} วัน`,
          action: 'ส่งรายชื่อ',
          to: `/sup/a/${a.id}`,
          urgent: d <= 5,
        })
      }
    })
    const order: Stage[] = ['live', 'closing', 'submit']
    todos.sort((x, y) => order.indexOf(stage(x.a, now)) - order.indexOf(stage(y.a, now)))
    // unread private messages go first: a student is waiting for an answer
    mine.forEach((a) => {
      const unread = dms.filter((m) => m.activityId === a.id && !m.fromSup && !m.read)
      if (!unread.length) return
      const who = [...new Set(unread.map((m) => m.studentId))]
      todos.unshift({
        a,
        icon: <ChatTeardropTextIcon size={22} weight="fill" />,
        title: who.length > 1 ? `ข้อความใหม่จากนิสิต ${who.length} คน` : `ข้อความใหม่จาก ${students[who[0]]?.name ?? 'นิสิต'}`,
        body: unread[unread.length - 1].text,
        action: 'อ่าน',
        to: who.length > 1 ? `/sup/a/${a.id}` : `/sup/a/${a.id}/dm/${who[0]}`,
        urgent: true,
      })
    })

    const group = (ss: Stage[]) =>
      withStage.filter((x) => ss.includes(x.s)).sort((x, y) => x.a.start - y.a.start)
    return {
      mine,
      todos,
      count: (a: Activity) => regCount({ registrations, extraReg }, a.id),
      active: group(['live', 'open', 'scheduled']),
      waiting: group(['closing', 'submit', 'waiting']),
      done: group(['done']).reverse(),
    }
  }, [activities, registrations, extraReg, credits, dms, students, sup, now])

  const dayList = day ? data.mine.filter((a) => dayKey(a.start) === day).sort((x, y) => x.start - y.start) : []

  if (!sup) return null

  return (
    <Page memoryKey="sup">
      <div className="pad safe-top sup" style={{ paddingBottom: 48 }}>
        <div className="row between gap-12" style={{ minHeight: 48 }}>
          <div className="stack" style={{ minWidth: 0 }}>
            <h1 className="t-title clamp-1">{sup.org}</h1>
            <span className="t-meta">ผู้คุมกิจกรรม {sup.name}</span>
          </div>
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="สลับโหมด">
            <ArrowsLeftRightIcon size={20} />
          </button>
        </div>

        <Section title="ต้องทำต่อ">
          {data.todos.length === 0 ? (
            <div className="card row gap-12" style={{ padding: 16 }}>
              <CheckCircleIcon size={28} weight="fill" className="t-success" />
              <div className="stack">
                <span className="t-strong">ไม่มีงานค้าง</span>
                <span className="t-meta">กิจกรรมที่จบแล้วส่งรายชื่อครบทุกงาน</span>
              </div>
            </div>
          ) : (
            data.todos.map((t, i) => <TodoCard key={`${t.a.id}-${t.action}`} t={t} i={i} />)
          )}
        </Section>

        <button className="btn btn-ink btn-block mt-20" onClick={() => navigate('/sup/new')}>
          <PlusIcon size={20} weight="bold" /> สร้างกิจกรรม
        </button>

        <Section title="ปฏิทิน">
          <MonthCalendar activities={data.mine} month={month} onMonth={setMonth} selected={day} onSelect={setDay} now={now} />
          {day && (
            <div className="stack gap-10">
              {dayList.length === 0 && <p className="t-meta">ไม่มีกิจกรรมในวันที่เลือก</p>}
              {dayList.map((a, i) => (
                <SupRow key={a.id} a={a} i={i} count={data.count(a)} now={now} />
              ))}
            </div>
          )}
        </Section>

        <Section title="สถิติของหน่วยงาน">
          <YearStats activities={data.mine} credits={credits} registrations={registrations} now={now} />
        </Section>

        <Section title={`กำลังเปิดรับและกำลังจัด ${data.active.length}`}>
          {data.active.length === 0 && <p className="t-meta">ยังไม่มีกิจกรรมที่เปิดรับ</p>}
          {data.active.map(({ a }, i) => (
            <SupRow key={a.id} a={a} i={i} count={data.count(a)} now={now} />
          ))}
        </Section>

        {data.waiting.length > 0 && (
          <Section title={`จบแล้ว รอส่งหรือรอบันทึก ${data.waiting.length}`}>
            {data.waiting.map(({ a }, i) => (
              <SupRow key={a.id} a={a} i={i} count={data.count(a)} now={now} />
            ))}
          </Section>
        )}

        {data.done.length > 0 && (
          <Section title={`บันทึกชั่วโมงแล้ว ${data.done.length}`}>
            {(showDone ? data.done : data.done.slice(0, 3)).map(({ a }, i) => (
              <SupRow key={a.id} a={a} i={i} count={data.count(a)} now={now} />
            ))}
            {!showDone && data.done.length > 3 && (
              <button className="btn btn-soft btn-block" onClick={() => setShowDone(true)}>
                ดูทั้งหมด {data.done.length} กิจกรรม
              </button>
            )}
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-32">
      <h2 className="t-h3">{title}</h2>
      <div className="stack gap-10 mt-12">{children}</div>
    </section>
  )
}

function TodoCard({ t, i }: { t: Todo; i: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(i, 6) * 0.05 }}
    >
      <Link to={t.to} className={`card todo press ${t.urgent ? 'urgent' : ''}`}>
        <span className="todo-icon">{t.icon}</span>
        <div className="stack grow gap-4" style={{ minWidth: 0 }}>
          <span className="t-strong" style={{ fontSize: 17 }}>
            {t.title}
          </span>
          <span className="t-meta clamp-2">{t.a.title}</span>
          <span className={`t-meta ${t.urgent ? 't-accent t-strong' : ''}`}>{t.body}</span>
        </div>
        <span className="btn btn-ink btn-xs" style={{ alignSelf: 'center' }}>
          {t.action}
        </span>
      </Link>
    </motion.div>
  )
}

function SupRow({ a, i, count, now }: { a: Activity; i: number; count: number; now: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(i, 6) * 0.04 }}
    >
      <Link to={`/sup/a/${a.id}`} className="card row press" style={{ padding: 12, gap: 14 }}>
        <img src={a.poster} alt="" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', flex: 'none' }} />
        <div className="stack grow gap-4" style={{ minWidth: 0 }}>
          <span className="t-strong clamp-1">{a.title}</span>
          <span className="t-small">
            {fmtDay(a.start)} {fmtTime(a.start)} น. ลงทะเบียน <b className="num">{count}</b>/<span className="num">{a.capacity}</span>
          </span>
          <span className="row gap-8 wrap">
            <StageMini s={stage(a, now)} />
            {a.end > now && !isVisible(a, now) && (
              <span className="row gap-4 t-small t-accent t-strong">
                <EyeSlashIcon size={14} weight="bold" /> ซ่อนอยู่
              </span>
            )}
          </span>
        </div>
        <CaretRightIcon size={18} className="t-faint" />
      </Link>
    </motion.div>
  )
}
