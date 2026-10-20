import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  ArrowsLeftRightIcon,
  CaretRightIcon,
  CheckCircleIcon,
  FileXlsIcon,
  MagnifyingGlassIcon,
  SealCheckIcon,
  SignOutIcon,
  TrayIcon,
} from '@phosphor-icons/react'
import { useStore } from '../../store'
import type { Activity } from '../../data/types'
import { Avatar, EASE_OUT, Empty, Page, Sheet, TopBar } from '../../ui/kit'
import { StageBar } from '../../ui/stage'
import { YearStats } from '../../ui/stats'
import { CAT_LABEL, fmtDate, fmtDay, fmtHours, fmtRange, fmtTime } from '../../lib/format'
import { useNow } from '../../lib/hooks'
import { haptic } from '../../lib/device'
import { daysToSubmit, stage, yearStart } from '../../lib/stage'
import { ORGS } from '../../data/seed'
import { KPI_ACTIVITIES } from '../../config'

export default function AdminHome() {
  const navigate = useNavigate()
  const sup = useStore((s) => s.sup)
  const me = useStore((s) => s.me)
  const activities = useStore((s) => s.activities)
  const credits = useStore((s) => s.credits)
  const registrations = useStore((s) => s.registrations)
  const setMode = useStore((s) => s.setMode)
  const supLogout = useStore((s) => s.supLogout)
  const [menu, setMenu] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const now = useNow()

  const d = useMemo(() => {
    const people = (a: Activity) => credits.filter((c) => c.activityId === a.id).length
    const withStage = activities.map((a) => ({ a, s: stage(a, now) }))
    const queue = withStage.filter((x) => x.s === 'waiting').sort((x, y) => (x.a.submittedAt ?? 0) - (y.a.submittedAt ?? 0))
    const pending = withStage
      .filter((x) => x.s === 'closing' || x.s === 'submit')
      .sort((x, y) => daysToSubmit(x.a, now) - daysToSubmit(y.a, now))
    const done = withStage.filter((x) => x.s === 'done').sort((x, y) => (y.a.recordedAt ?? 0) - (x.a.recordedAt ?? 0))
    const y0 = yearStart(now)
    const units = Object.entries(ORGS)
      .map(([code, org]) => {
        const held = activities.filter((a) => a.orgCode === code && a.start >= y0 && a.start <= now)
        const ids = new Set(held.map((a) => a.id))
        return {
          code,
          org,
          count: held.length,
          hours: credits.filter((c) => ids.has(c.activityId)).reduce((t, c) => t + c.hours, 0),
          waiting: queue.filter((x) => x.a.orgCode === code).length,
        }
      })
      .sort((x, y) => y.count - x.count)
    return { people, queue, pending, done, units }
  }, [activities, credits, now])

  if (!sup) return null

  return (
    <Page memoryKey="admin">
      <div className="pad safe-top sup admin" style={{ paddingBottom: 48 }}>
        <div className="row between gap-12" style={{ minHeight: 48 }}>
          <div className="stack" style={{ minWidth: 0 }}>
            <h1 className="t-title clamp-1">{sup.org}</h1>
            <span className="t-meta">แอดมิน {sup.name}</span>
          </div>
          <button className="icon-btn" onClick={() => setMenu(true)} aria-label="สลับโหมด">
            <ArrowsLeftRightIcon size={20} />
          </button>
        </div>

        <div className="admin-grid">
          <div className="stack">
            <Section title={`รอบันทึกลงระบบ ${d.queue.length}`}>
              <p className="t-meta">รายชื่อที่ผู้คุมส่งมาแล้ว เปิดดู ดาวน์โหลด Excel ไปคีย์ แล้วกดบันทึกแล้วเพื่อแจ้งเตือนนิสิต</p>
              {d.queue.length === 0 && (
                <div className="card row gap-12" style={{ padding: 16 }}>
                  <CheckCircleIcon size={28} weight="fill" className="t-success" />
                  <span className="t-strong">บันทึกครบทุกกิจกรรมแล้ว</span>
                </div>
              )}
              {d.queue.map(({ a }, i) => (
                <QueueRow key={a.id} a={a} i={i} people={d.people(a)} />
              ))}
            </Section>

            {d.pending.length > 0 && (
              <Section title={`หน่วยงานที่ยังไม่ส่งรายชื่อ ${d.pending.length}`}>
                <div className="card stack list" style={{ padding: '0 16px' }}>
                  {d.pending.map(({ a, s }) => {
                    const left = daysToSubmit(a, now)
                    return (
                      <div key={a.id} className="row gap-12" style={{ padding: '12px 0' }}>
                        <div className="stack grow" style={{ minWidth: 0 }}>
                          <span className="t-strong clamp-1">{a.title}</span>
                          <span className="t-small clamp-1">
                            {a.org} จบ {fmtDay(a.end)}
                          </span>
                        </div>
                        <span className={`chip ${left <= 5 ? 'accent' : ''}`}>
                          {s === 'closing' ? 'รอปิดรายชื่อ' : left >= 0 ? `เหลือ ${left} วัน` : `เลย ${-left} วัน`}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Section>
            )}

            {d.done.length > 0 && (
              <Section title={`บันทึกแล้ว ${d.done.length}`}>
                <div className="card stack list" style={{ padding: '0 16px' }}>
                  {(showDone ? d.done : d.done.slice(0, 4)).map(({ a }) => (
                    <Link key={a.id} to={`/sup/admin/a/${a.id}`} className="row gap-12 press" style={{ padding: '12px 0' }}>
                      <div className="stack grow" style={{ minWidth: 0 }}>
                        <span className="clamp-1">{a.title}</span>
                        <span className="t-small clamp-1">
                          {a.org} บันทึก {a.recordedAt && fmtDate(a.recordedAt)}
                        </span>
                      </div>
                      <span className="num t-strong">{d.people(a)} คน</span>
                      <CaretRightIcon size={16} className="t-faint" />
                    </Link>
                  ))}
                </div>
                {!showDone && d.done.length > 4 && (
                  <button className="btn btn-soft btn-block" onClick={() => setShowDone(true)}>
                    ดูทั้งหมด {d.done.length} กิจกรรม
                  </button>
                )}
              </Section>
            )}
          </div>

          <div className="stack">
            <Section title="สถิติทั้งศูนย์">
              <YearStats activities={activities} credits={credits} registrations={registrations} now={now} kpi={KPI_ACTIVITIES} />
            </Section>

            <Section title="แยกตามหน่วยงาน">
              <div className="card stack list" style={{ padding: '0 16px' }}>
                {d.units.map((u) => (
                  <div key={u.code} className="row gap-12" style={{ padding: '12px 0' }}>
                    <Avatar name={u.org} size={36} />
                    <div className="stack grow" style={{ minWidth: 0 }}>
                      <span className="t-strong clamp-1">{u.org}</span>
                      <span className="t-small">
                        {u.count} กิจกรรม {fmtHours(u.hours)} ชม.
                      </span>
                    </div>
                    {u.waiting > 0 && <span className="chip accent">รอบันทึก {u.waiting}</span>}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
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
            <SignOutIcon size={18} /> ออกจากโหมดแอดมิน
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

function QueueRow({ a, i, people }: { a: Activity; i: number; people: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.4, ease: EASE_OUT, delay: Math.min(i, 6) * 0.05 }}
    >
      <Link to={`/sup/admin/a/${a.id}`} className="card todo press">
        <span className="todo-icon">
          <TrayIcon size={22} weight="bold" />
        </span>
        <div className="stack grow gap-4" style={{ minWidth: 0 }}>
          <span className="t-strong clamp-2" style={{ fontSize: 17 }}>
            {a.title}
          </span>
          <span className="t-meta clamp-1">{a.org}</span>
          <span className="t-meta">
            <b className="num">{people}</b> คน คนละ <b className="num">{fmtHours(a.hours)}</b> ชม. ส่งเมื่อ {a.submittedAt && fmtDay(a.submittedAt)}
          </span>
        </div>
        <CaretRightIcon size={18} className="t-faint" style={{ alignSelf: 'center' }} />
      </Link>
    </motion.div>
  )
}

export function AdminActivity() {
  const { id = '' } = useParams()
  const a = useStore((s) => s.activities.find((x) => x.id === id))
  const credits = useStore((s) => s.credits)
  const students = useStore((s) => s.students)
  const recordHours = useStore((s) => s.recordHours)
  const [confirm, setConfirm] = useState(false)
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(40)
  const now = useNow()

  const rows = useMemo(
    () =>
      credits
        .filter((c) => c.activityId === id)
        .map((c) => ({ c, s: students[c.studentId] ?? { id: c.studentId, name: c.studentId, faculty: '' } }))
        .sort((x, y) => x.s.id.localeCompare(y.s.id)),
    [credits, students, id],
  )

  if (!a) return <Empty icon={<TrayIcon size={26} />} title="ไม่พบกิจกรรม" />

  const total = rows.reduce((t, r) => t + r.c.hours, 0)
  const shown = rows.filter((r) => !q || r.s.name.includes(q.trim()) || r.s.id.includes(q.trim()))

  const exportXlsx = async () => {
    const { default: writeXlsxFile } = await import('write-excel-file/browser')
    const data = rows.map((r, i) => ({ i: i + 1, ...r }))
    type R = (typeof data)[number]
    await writeXlsxFile<R>(data, {
      columns: [
        { header: 'ลำดับ', cell: (r) => r.i, width: 7 },
        { header: 'รหัสนิสิต', cell: (r) => r.s.id, width: 12 },
        { header: 'ชื่อ-นามสกุล', cell: (r) => r.s.name, width: 28 },
        { header: 'คณะ', cell: (r) => r.s.faculty, width: 30 },
        { header: 'กิจกรรม', cell: () => a.title, width: 40 },
        { header: 'หน่วยงาน', cell: () => a.org, width: 28 },
        { header: 'ประเภท', cell: () => CAT_LABEL[a.category], width: 12 },
        { header: 'วันที่จัด', cell: () => fmtDate(a.start), width: 14 },
        { header: 'ชั่วโมง', cell: (r) => r.c.hours, width: 9 },
      ],
    }).toFile(`${a.title.slice(0, 40)} บันทึกชั่วโมง.xlsx`)
    toast.success('ดาวน์โหลดไฟล์ Excel แล้ว', { description: `${rows.length} คน รวม ${fmtHours(total)} ชั่วโมง` })
  }

  return (
    <>
      <Page>
        <TopBar title={a.title} fallback="/sup/admin" />
        <div className="pad sup" style={{ paddingBottom: 60 }}>
          <div className="row gap-14" style={{ gap: 14 }}>
            <img src={a.poster} alt="" style={{ width: 84, height: 84, borderRadius: 18, objectFit: 'cover', flex: 'none' }} />
            <div className="stack" style={{ minWidth: 0 }}>
              <h1 className="t-h3 clamp-2" style={{ fontSize: 19 }}>
                {a.title}
              </h1>
              <span className="t-small clamp-1">{a.org}</span>
              <span className="t-small">
                {fmtDay(a.start)} {fmtRange(a.start, a.end)}
              </span>
            </div>
          </div>

          <div className="card mt-16" style={{ padding: '18px 10px 14px' }}>
            <StageBar a={a} now={now} />
          </div>

          <div className="card stack list mt-12" style={{ padding: '0 16px' }}>
            <Row label="ได้รับชั่วโมง" value={`${rows.length} คน`} />
            <Row label="ชั่วโมงต่อคน" value={`${fmtHours(a.hours)} ชม. ${CAT_LABEL[a.category]}`} />
            <Row label="รวมทั้งหมด" value={`${fmtHours(total)} ชม.`} />
            <Row label="ผู้คุมส่งรายชื่อ" value={a.submittedAt ? `${fmtDay(a.submittedAt)} ${fmtTime(a.submittedAt)} น.` : 'ยังไม่ส่ง'} />
          </div>

          <div className="stack gap-8 mt-16">
            <button className="btn btn-soft btn-block" onClick={exportXlsx}>
              <FileXlsIcon size={20} /> ดาวน์โหลด Excel ไปคีย์
            </button>
            {a.recordedAt ? (
              <div className="card row gap-12" style={{ padding: 16 }}>
                <SealCheckIcon size={26} weight="fill" className="t-success" style={{ flex: 'none' }} />
                <p className="t-meta grow">
                  บันทึกลงระบบของมหาวิทยาลัยแล้ว {fmtDate(a.recordedAt)} แจ้งเตือนนิสิตให้เข้าไปยืนยันแล้ว
                </p>
              </div>
            ) : (
              <button className="btn btn-ink btn-block" disabled={!a.submittedAt} onClick={() => setConfirm(true)}>
                <SealCheckIcon size={20} weight="bold" /> บันทึกลงระบบแล้ว
              </button>
            )}
          </div>

          <h2 className="t-h3 mt-32">รายชื่อ {rows.length} คน</h2>
          <div className="row grow gap-8 input mt-12" style={{ height: 44, paddingLeft: 14 }}>
            <MagnifyingGlassIcon size={18} className="t-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ค้นหาชื่อหรือรหัส"
              style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, minWidth: 0 }}
            />
          </div>
          <div className="stack list mt-8">
            {shown.slice(0, limit).map((r) => (
              <div key={r.s.id} className="row gap-12" style={{ padding: '12px 0' }}>
                <Avatar name={r.s.name} size={40} />
                <div className="stack grow" style={{ minWidth: 0 }}>
                  <span className="clamp-1">{r.s.name}</span>
                  <span className="t-small num clamp-1">{r.s.id}</span>
                </div>
                <span className="num t-strong">+{fmtHours(r.c.hours)}</span>
              </div>
            ))}
          </div>
          {shown.length > limit && (
            <button className="btn btn-soft btn-block mt-12" onClick={() => setLimit((l) => l + 60)}>
              แสดงเพิ่ม ({shown.length - limit})
            </button>
          )}
        </div>
      </Page>

      <Sheet open={confirm} onClose={() => setConfirm(false)}>
        <div className="stack gap-16">
          <h2 className="t-title" style={{ fontSize: 22 }}>
            บันทึกลงระบบแล้ว?
          </h2>
          <p className="t-meta">
            ยืนยันว่าคีย์ชั่วโมงของนิสิต <b className="num">{rows.length}</b> คน ลงระบบของมหาวิทยาลัยแล้ว ระบบจะแจ้งเตือนนิสิตทุกคนให้เข้าไปยืนยันชั่วโมงเอง
          </p>
          <button
            className="btn btn-ink btn-block"
            onClick={() => {
              recordHours(a.id)
              haptic.success()
              toast.success('บันทึกแล้ว', { description: `แจ้งเตือนนิสิต ${rows.length} คนให้เข้าไปยืนยันชั่วโมง` })
              setConfirm(false)
            }}
          >
            ยืนยันและแจ้งเตือนนิสิต
          </button>
        </div>
      </Sheet>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between gap-12" style={{ padding: '12px 0' }}>
      <span className="t-meta">{label}</span>
      <span className="t-strong num" style={{ textAlign: 'right' }}>
        {value}
      </span>
    </div>
  )
}
