import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import {
  CaretRightIcon,
  ChatCircleDotsIcon,
  CheckCircleIcon,
  HourglassIcon,
  ListChecksIcon,
  PaperPlaneTiltIcon,
  FileXlsIcon,
  ImageSquareIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  QrCodeIcon,
  UserPlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useStore, regCount } from '../../store'
import type { Activity, Student } from '../../data/types'
import { StageBar } from '../../ui/stage'
import { useNow } from '../../lib/hooks'
import { AUTO_CLOSE_H } from '../../config'
import { closedAt, daysToSubmit, stage, submitDeadline } from '../../lib/stage'
import { waiverKey } from '../../lib/credit'
import { FACULTIES } from '../../data/seed'
import { Avatar, EASE_OUT, Empty, Lightbox, Page, Segmented, Sheet, TopBar } from '../../ui/kit'
import { CAT_LABEL, fmtDate, fmtDay, fmtHours, fmtRange, fmtTime, relDay, timeAgo } from '../../lib/format'
import { compressImage, haptic } from '../../lib/device'

type Filter = 'all' | 'done' | 'wait'

export default function Manage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const a = useStore((s) => s.activities.find((x) => x.id === id))
  const registrations = useStore((s) => s.registrations)
  const extraReg = useStore((s) => s.extraReg)
  const credits = useStore((s) => s.credits)
  const students = useStore((s) => s.students)
  const chats = useStore((s) => s.chats)
  const [tab, setTab] = useState<'roster' | 'posts'>('roster')
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [limit, setLimit] = useState(40)
  const [picked, setPicked] = useState<Student | null>(null)
  const [adding, setAdding] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'close' | 'submit' | null>(null)
  const closeRoster = useStore((s) => s.closeRoster)
  const submitRoster = useStore((s) => s.submitRoster)
  const now = useNow()
  const waivers = useStore((s) => s.waivers)
  const lateCancels = useStore((s) => s.lateCancels)
  const waive = useStore((s) => s.waive)

  const roster = useMemo(() => {
    const cr = new Map(credits.filter((c) => c.activityId === id).map((c) => [c.studentId, c]))
    return registrations
      .filter((r) => r.activityId === id)
      .map((r) => ({ s: students[r.studentId] ?? { id: r.studentId, name: r.studentId, faculty: '' }, credit: cr.get(r.studentId), at: r.at }))
      .sort((x, y) => (y.credit?.at ?? 0) - (x.credit?.at ?? 0) || x.s.name.localeCompare(y.s.name, 'th'))
  }, [registrations, credits, students, id])

  if (!a) return <Empty icon={<QrCodeIcon size={26} />} title="ไม่พบกิจกรรม" />

  const doneCount = roster.filter((r) => r.credit).length
  const shown = roster.filter(
    (r) =>
      (filter === 'all' || (filter === 'done' ? !!r.credit : !r.credit)) &&
      (!q || r.s.name.includes(q.trim()) || r.s.id.includes(q.trim())),
  )
  const msgCount = chats.filter((c) => c.activityId === id).length
  const closed = !!closedAt(a, now)
  const lateHere = lateCancels.filter((c) => c.activityId === a.id)

  const exportXlsx = async () => {
    const { default: writeXlsxFile } = await import('write-excel-file/browser')
    const rows = roster.map((r, i) => ({ i: i + 1, ...r }))
    type R = (typeof rows)[number]
    await writeXlsxFile<R>(rows, {
      columns: [
        { header: 'ลำดับ', cell: (r) => r.i, width: 7 },
        { header: 'รหัสนิสิต', cell: (r) => r.s.id, width: 12 },
        { header: 'ชื่อ-นามสกุล', cell: (r) => r.s.name, width: 28 },
        { header: 'คณะ', cell: (r) => r.s.faculty, width: 30 },
        { header: 'กิจกรรม', cell: () => a.title, width: 40 },
        { header: 'ประเภท', cell: () => CAT_LABEL[a.category], width: 12 },
        { header: 'วันที่จัด', cell: () => fmtDate(a.start), width: 14 },
        { header: 'ชั่วโมง', cell: (r) => (r.credit ? r.credit.hours : 0), width: 9 },
        { header: 'สถานะ', cell: (r) => (r.credit ? 'ได้รับชั่วโมง' : 'ไม่ได้สแกน'), width: 14 },
        { header: 'เวลายืนยัน', cell: (r) => (r.credit ? `${fmtTime(r.credit.at)} น.` : ''), width: 12 },
        { header: 'ยืนยันโดย', cell: (r) => (r.credit ? (r.credit.method === 'qr' ? 'สแกน QR' : 'ผู้คุมเพิ่มเอง') : ''), width: 14 },
      ],
    }).toFile(`${a.title.slice(0, 40)} รายชื่อ.xlsx`)
    toast.success('ดาวน์โหลดไฟล์ Excel แล้ว', { description: `${roster.length} รายชื่อ ได้รับชั่วโมง ${doneCount} คน` })
  }

  return (
    <>
      <Page>
        <TopBar
          title={a.title}
          fallback="/sup"
          end={
            <button className="icon-btn" onClick={() => navigate(`/sup/edit/${a.id}`)} aria-label="แก้ไขกิจกรรม">
              <PencilSimpleIcon size={20} />
            </button>
          }
        />
        <div className="pad" style={{ paddingBottom: 60 }}>
          <div className="row gap-14" style={{ gap: 14 }}>
            <img src={a.poster} alt="" style={{ width: 84, height: 84, borderRadius: 18, objectFit: 'cover', flex: 'none' }} />
            <div className="stack" style={{ minWidth: 0 }}>
              <h1 className="t-h3 clamp-2" style={{ fontSize: 19 }}>
                {a.title}
              </h1>
              <span className="t-small">
                {fmtDay(a.start)} {fmtRange(a.start, a.end)}
              </span>
              <span className="t-small clamp-1">{a.place}</span>
            </div>
          </div>

          <div className="row gap-10 mt-20">
            <div className="card stack grow" style={{ padding: '14px 16px' }}>
              <span className="num" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
                {regCount({ registrations, extraReg }, a.id)}
                <span className="t-meta">/{a.capacity}</span>
              </span>
              <span className="t-small">ลงทะเบียน</span>
            </div>
            <div className="card stack grow" style={{ padding: '14px 16px' }}>
              <span className="num" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2, color: doneCount ? 'var(--success)' : undefined }}>
                {doneCount}
              </span>
              <span className="t-small">ได้รับ {fmtHours(a.hours)} ชม. แล้ว</span>
            </div>
          </div>

          <div className="card mt-16" style={{ padding: '18px 10px 14px' }}>
            <StageBar a={a} now={now} />
          </div>
          <StageAction
            a={a}
            now={now}
            unscanned={roster.length - doneCount}
            done={doneCount}
            onQr={() => navigate(`/sup/a/${a.id}/qr`)}
            onClose={() => setConfirm('close')}
            onSubmit={() => setConfirm('submit')}
            onWait={() => {
              setTab('roster')
              setFilter('wait')
            }}
          />

          {a.chatEnabled && (
            <button className="card row gap-12 press mt-12" style={{ padding: 14, width: '100%', textAlign: 'left' }} onClick={() => navigate(`/sup/a/${a.id}/chat`)}>
              <ChatCircleDotsIcon size={22} weight="fill" className="t-accent" />
              <span className="grow t-strong">ห้องแชทกิจกรรม</span>
              <span className="t-small num">{msgCount} ข้อความ</span>
              <CaretRightIcon size={16} className="t-faint" />
            </button>
          )}

          <div className="mt-24">
            <Segmented
              id="manage"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'roster', label: `รายชื่อ ${roster.length}` },
                { value: 'posts', label: `ประกาศ ${a.announcements.length}` },
              ]}
            />
          </div>

          {tab === 'roster' ? (
            <div className="mt-16">
              <div className="row gap-8">
                <div className="row grow gap-8 input" style={{ height: 44, paddingLeft: 14 }}>
                  <MagnifyingGlassIcon size={18} className="t-faint" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="ค้นหาชื่อหรือรหัส"
                    style={{ border: 0, outline: 'none', background: 'transparent', flex: 1, minWidth: 0 }}
                  />
                </div>
                {!a.submittedAt && (
                  <button className="icon-btn" style={{ width: 44, height: 44 }} onClick={() => setAdding(true)} aria-label="เพิ่มนิสิต">
                    <UserPlusIcon size={20} />
                  </button>
                )}
                <button className="icon-btn" style={{ width: 44, height: 44 }} onClick={exportXlsx} aria-label="ส่งออก Excel">
                  <FileXlsIcon size={20} />
                </button>
              </div>
              <div className="row gap-8 mt-12 wrap">
                {(
                  [
                    ['all', `ทั้งหมด ${roster.length}`],
                    ['done', `ได้รับชั่วโมง ${doneCount}`],
                    ['wait', `ยังไม่สแกน ${roster.length - doneCount}`],
                  ] as [Filter, string][]
                ).map(([k, label]) => (
                  <button key={k} className={`chip press ${filter === k ? 'ink' : ''}`} onClick={() => setFilter(k)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="stack list mt-8">
                {shown.slice(0, limit).map((r) => (
                  <button
                    key={r.s.id}
                    className="row gap-12 press"
                    style={{ padding: '12px 0', width: '100%', textAlign: 'left' }}
                    onClick={() => !a.submittedAt && setPicked(r.s)}
                  >
                    <Avatar name={r.s.name} size={40} />
                    <div className="stack grow" style={{ minWidth: 0 }}>
                      <span className="clamp-1">{r.s.name}</span>
                      <span className="t-small num clamp-1">
                        {r.s.id} {r.s.faculty && `คณะ${r.s.faculty}`}
                      </span>
                    </div>
                    {r.credit ? (
                      <span className="chip success">{r.credit.method === 'manual' ? 'เพิ่มเอง' : fmtTime(r.credit.at)}</span>
                    ) : closed ? (
                      waivers.includes(waiverKey(a.id, r.s.id)) ? (
                        <span className="chip">คืนเครดิตแล้ว</span>
                      ) : (
                        <span className="chip danger">ไม่มา</span>
                      )
                    ) : (
                      <span className="chip">ยังไม่สแกน</span>
                    )}
                  </button>
                ))}
              </div>
              {shown.length > limit && (
                <button className="btn btn-soft btn-block mt-12" onClick={() => setLimit((l) => l + 60)}>
                  แสดงเพิ่ม ({shown.length - limit})
                </button>
              )}
              {shown.length === 0 && <p className="t-meta mt-16">ไม่พบรายชื่อ</p>}
              {lateHere.length > 0 && (
                <div className="mt-24">
                  <h3 className="t-h3">ยกเลิกหลังกำหนด {lateHere.length} คน</h3>
                  <p className="t-small mt-4">ถูกหักเครดิตแล้ว ถ้ามีเหตุสุดวิสัย กดคืนเครดิตให้ได้</p>
                  <div className="stack list mt-8">
                    {lateHere.map((c) => {
                      const st = students[c.studentId]
                      const given = waivers.includes(waiverKey(a.id, c.studentId))
                      return (
                        <div key={c.studentId} className="row gap-12" style={{ padding: '12px 0' }}>
                          <Avatar name={st?.name ?? c.studentId} size={40} />
                          <div className="stack grow" style={{ minWidth: 0 }}>
                            <span className="clamp-1">{st?.name ?? c.studentId}</span>
                            <span className="t-small">ยกเลิก {fmtDay(c.at)} {fmtTime(c.at)} น.</span>
                          </div>
                          {given ? (
                            <span className="chip">คืนแล้ว</span>
                          ) : (
                            <button
                              className="btn btn-soft btn-xs"
                              onClick={() => {
                                waive(a.id, c.studentId)
                                toast.success('คืนเครดิตแล้ว', { description: st?.name })
                              }}
                            >
                              คืนเครดิต
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Posts activityId={a.id} onImage={setLightbox} />
          )}
        </div>
      </Page>

      <RosterActions student={picked} activityId={a.id} hours={a.hours} closed={closed} onClose={() => setPicked(null)} />
      <AddStudent open={adding} activityId={a.id} onClose={() => setAdding(false)} />
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
      <Sheet open={!!confirm} onClose={() => setConfirm(null)}>
        {confirm === 'close' ? (
          <div className="stack gap-16">
            <h2 className="t-title" style={{ fontSize: 22 }}>
              ปิดรายชื่อ
            </h2>
            <p className="t-body">
              ได้รับชั่วโมง <b className="num">{doneCount}</b> คน ยังไม่สแกน <b className="num">{roster.length - doneCount}</b> คน
            </p>
            <p className="t-meta">
              คนที่ยังไม่สแกนจะถูกบันทึกว่าไม่มา ถ้ามีคนมาจริงแต่สแกนไม่ได้ ให้เพิ่มชั่วโมงให้ก่อนปิด หลังปิดแล้วยังแก้รายชื่อได้จนกว่าจะส่งให้ศูนย์
            </p>
            <button
              className="btn btn-ink btn-block"
              onClick={() => {
                closeRoster(a.id)
                haptic.success()
                toast.success('ปิดรายชื่อแล้ว', { description: 'ขั้นต่อไป ส่งรายชื่อให้ศูนย์จิตอาสา' })
                setConfirm(null)
              }}
            >
              ปิดรายชื่อ
            </button>
          </div>
        ) : (
          <div className="stack gap-16">
            <h2 className="t-title" style={{ fontSize: 22 }}>
              ส่งรายชื่อให้ศูนย์จิตอาสา
            </h2>
            <div className="card stack list" style={{ padding: '0 16px' }}>
              <SumRow label="ได้รับชั่วโมง" value={`${doneCount} คน`} />
              <SumRow label="ชั่วโมงต่อคน" value={`${fmtHours(a.hours)} ชม.`} />
              <SumRow label="รวมทั้งหมด" value={`${fmtHours(doneCount * a.hours)} ชม.`} />
            </div>
            <p className="t-meta">ศูนย์จะบันทึกลงระบบของมหาวิทยาลัย แล้วแจ้งเตือนนิสิตให้เข้าไปยืนยันชั่วโมงเอง ส่งแล้วแก้รายชื่อไม่ได้</p>
            <button
              className="btn btn-ink btn-block"
              onClick={() => {
                submitRoster(a.id)
                haptic.success()
                toast.success('ส่งรายชื่อแล้ว', { description: 'รอศูนย์จิตอาสาบันทึกลงระบบ' })
                setConfirm(null)
              }}
            >
              <PaperPlaneTiltIcon size={18} weight="bold" /> ส่งรายชื่อ
            </button>
          </div>
        )}
      </Sheet>
    </>
  )
}

function SumRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="row between" style={{ padding: '12px 0' }}>
      <span className="t-meta">{label}</span>
      <span className="t-strong num">{value}</span>
    </div>
  )
}

/** What the supervisor should do now, for the current stage. */
function StageAction({
  a,
  now,
  unscanned,
  done,
  onQr,
  onClose,
  onSubmit,
  onWait,
}: {
  a: Activity
  now: number
  unscanned: number
  done: number
  onQr: () => void
  onClose: () => void
  onSubmit: () => void
  onWait: () => void
}) {
  const s = stage(a, now)
  if (s === 'scheduled' || s === 'open')
    return (
      <div className="stack gap-8 mt-12">
        <p className="t-meta">
          {s === 'scheduled' && a.opensAt
            ? `เปิดรับสมัคร ${fmtDay(a.opensAt)} ${fmtTime(a.opensAt)} น. นิสิตเห็นกิจกรรมล่วงหน้าและกดเตือนได้`
            : `เปิดรับสมัครอยู่ กิจกรรมเริ่ม${relDay(a.start, now) === 'วันนี้' ? 'วันนี้' : ` ${fmtDay(a.start)}`} ${fmtTime(a.start)} น.`}
        </p>
        <button className="btn btn-soft btn-block" onClick={onQr}>
          <QrCodeIcon size={20} weight="bold" /> เปิด QR รับชั่วโมง
        </button>
      </div>
    )
  if (s === 'live')
    return (
      <div className="stack gap-8 mt-12">
        <button className="btn btn-accent btn-block" onClick={onQr}>
          <QrCodeIcon size={20} weight="bold" /> เปิด QR รับชั่วโมง
        </button>
        <p className="t-small" style={{ textAlign: 'center' }}>
          ให้นิสิตสแกนก่อนกลับ จบ {fmtTime(a.end)} น.
        </p>
      </div>
    )
  if (s === 'closing') {
    const left = Math.max(1, Math.ceil((a.end + AUTO_CLOSE_H * 3600_000 - now) / 3600_000))
    return (
      <div className="stack gap-8 mt-12">
        <p className="t-meta">
          กิจกรรมจบแล้ว ยังไม่สแกน <b className="num">{unscanned}</b> คน ตรวจรายชื่อ เพิ่มชั่วโมงให้คนที่มาจริง แล้วกดปิดรายชื่อ ถ้าไม่กด
          ระบบจะปิดเองในอีก {left} ชม.
        </p>
        <div className="row gap-8">
          {unscanned > 0 && (
            <button className="btn btn-soft grow" onClick={onWait}>
              ดูคนที่ยังไม่สแกน
            </button>
          )}
          <button className="btn btn-ink grow" onClick={onClose}>
            <ListChecksIcon size={18} weight="bold" /> ปิดรายชื่อ
          </button>
        </div>
      </div>
    )
  }
  if (s === 'submit') {
    const d = daysToSubmit(a, now)
    return (
      <div className="stack gap-8 mt-12">
        <p className={`t-meta ${d <= 5 ? 't-accent t-strong' : ''}`}>
          {d >= 0 ? `ส่งรายชื่อให้ศูนย์จิตอาสาภายใน ${d} วัน (${fmtDate(submitDeadline(a))})` : `เลยกำหนดส่งมา ${-d} วัน`}
        </p>
        <button className="btn btn-ink btn-block" onClick={onSubmit}>
          <PaperPlaneTiltIcon size={18} weight="bold" /> ส่งรายชื่อ {done} คน
        </button>
      </div>
    )
  }
  if (s === 'waiting')
    return (
      <div className="card row gap-12 mt-12" style={{ padding: 16 }}>
        <HourglassIcon size={26} className="t-accent" style={{ flex: 'none' }} />
        <p className="t-meta grow">ส่งรายชื่อแล้ว {a.submittedAt && fmtDate(a.submittedAt)} รอศูนย์จิตอาสาบันทึกลงระบบของมหาวิทยาลัย</p>
      </div>
    )
  return (
    <div className="card row gap-12 mt-12" style={{ padding: 16 }}>
      <CheckCircleIcon size={26} weight="fill" className="t-success" style={{ flex: 'none' }} />
      <p className="t-meta grow">ศูนย์บันทึกชั่วโมงแล้ว {a.recordedAt && fmtDate(a.recordedAt)} แจ้งเตือนนิสิตให้ไปยืนยันแล้ว</p>
    </div>
  )
}

function RosterActions({
  student,
  activityId,
  hours,
  closed,
  onClose,
}: {
  student: Student | null
  activityId: string
  hours: number
  closed: boolean
  onClose: () => void
}) {
  const credits = useStore((s) => s.credits)
  const waivers = useStore((s) => s.waivers)
  const waive = useStore((s) => s.waive)
  const addWalkIn = useStore((s) => s.addWalkIn)
  const revoke = useStore((s) => s.revokeCredit)
  const remove = useStore((s) => s.removeRegistration)
  const credit = student && credits.find((c) => c.activityId === activityId && c.studentId === student.id)
  return (
    <Sheet open={!!student} onClose={onClose}>
      {student && (
        <div className="stack gap-16">
          <div className="row gap-12">
            <Avatar name={student.name} size={48} />
            <div className="stack">
              <span className="t-h3">{student.name}</span>
              <span className="t-small num">{student.id}</span>
            </div>
          </div>
          {credit && (
            <p className="t-meta">
              ได้รับ {fmtHours(credit.hours)} ชั่วโมง เมื่อ {fmtTime(credit.at)} น.{' '}
              {credit.method === 'qr' ? `สแกน QR ห่างจากผู้คุม ${credit.distance ?? '-'} ม.` : 'ผู้คุมเพิ่มให้เอง'}
            </p>
          )}
          {closed && !credit && (
            <div className="card stack gap-4" style={{ padding: 14 }}>
              {waivers.includes(waiverKey(activityId, student.id)) ? (
                <span className="t-strong">คืนเครดิตให้แล้ว</span>
              ) : (
                <>
                  <span className="t-strong">ไม่มา ถูกหักเครดิต 1 ครั้ง</span>
                  <span className="t-small">ถ้ามีเหตุสุดวิสัย เช่น ป่วยหรืออุบัติเหตุ คืนเครดิตให้ได้</span>
                  <button
                    className="btn btn-soft btn-sm mt-8"
                    onClick={() => {
                      waive(activityId, student.id)
                      toast.success('คืนเครดิตแล้ว', { description: student.name })
                      onClose()
                    }}
                  >
                    คืนเครดิต
                  </button>
                </>
              )}
            </div>
          )}
          <div className="stack gap-8">
            {credit ? (
              <button
                className="btn btn-soft btn-block"
                onClick={() => {
                  revoke(activityId, student.id)
                  toast('ยกเลิกชั่วโมงแล้ว')
                  onClose()
                }}
              >
                ยกเลิกชั่วโมงของคนนี้
              </button>
            ) : (
              <button
                className="btn btn-ink btn-block"
                onClick={() => {
                  addWalkIn(activityId, student)
                  haptic.success()
                  toast.success(`ให้ ${fmtHours(hours)} ชั่วโมงแล้ว`, { description: student.name })
                  onClose()
                }}
              >
                ให้ชั่วโมงด้วยตนเอง
              </button>
            )}
            <button
              className="btn btn-danger-soft btn-block"
              onClick={() => {
                remove(activityId, student.id)
                toast('ลบออกจากกิจกรรมแล้ว')
                onClose()
              }}
            >
              ลบออกจากรายชื่อ
            </button>
          </div>
        </div>
      )}
    </Sheet>
  )
}

function AddStudent({ open, activityId, onClose }: { open: boolean; activityId: string; onClose: () => void }) {
  const students = useStore((s) => s.students)
  const addWalkIn = useStore((s) => s.addWalkIn)
  const [sid, setSid] = useState('')
  const [name, setName] = useState('')
  const [fac, setFac] = useState(FACULTIES[0])
  const known = students[sid]
  const ok = /^\d{8}$/.test(sid) && (known || name.trim().length > 3)
  return (
    <Sheet open={open} onClose={onClose}>
      <form
        className="stack gap-16"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ok) return
          addWalkIn(activityId, known ?? { id: sid, name: name.trim(), faculty: fac })
          haptic.success()
          toast.success('เพิ่มรายชื่อและให้ชั่วโมงแล้ว')
          setSid('')
          setName('')
          onClose()
        }}
      >
        <h2 className="t-title" style={{ fontSize: 22 }}>
          เพิ่มนิสิตด้วยตนเอง
        </h2>
        <p className="t-meta">สำหรับคนที่มาจริงแต่สแกนไม่ได้ เช่น โทรศัพท์แบตหมด ระบบจะบันทึกว่าผู้คุมเป็นคนยืนยัน</p>
        <div className="field">
          <label htmlFor="as">รหัสนิสิต</label>
          <input id="as" className="input num" inputMode="numeric" maxLength={8} value={sid} onChange={(e) => setSid(e.target.value.replace(/\D/g, ''))} />
          {known && <span className="field-help">พบในระบบ: {known.name}</span>}
        </div>
        {!known && (
          <>
            <div className="field">
              <label htmlFor="an">ชื่อ-นามสกุล</label>
              <input id="an" className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="af">คณะ</label>
              <select id="af" className="input" value={fac} onChange={(e) => setFac(e.target.value)}>
                {FACULTIES.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </>
        )}
        <button className="btn btn-ink btn-block" disabled={!ok}>
          เพิ่มและให้ชั่วโมง
        </button>
      </form>
    </Sheet>
  )
}

function Posts({ activityId, onImage }: { activityId: string; onImage: (s: string) => void }) {
  const a = useStore((s) => s.activities.find((x) => x.id === activityId))!
  const registrations = useStore((s) => s.registrations)
  const extraReg = useStore((s) => s.extraReg)
  const post = useStore((s) => s.postAnnouncement)
  const [text, setText] = useState('')
  const [imgs, setImgs] = useState<string[]>([])
  const [busy, setBusy] = useState(false)

  const attach = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      const out = await Promise.all([...files].slice(0, 4 - imgs.length).map((f) => compressImage(f, 1080, 0.7)))
      setImgs((p) => [...p, ...out].slice(0, 4))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-16">
      <div className="card" style={{ padding: 14 }}>
        <textarea
          className="input"
          style={{ border: 0, padding: 4, minHeight: 88, boxShadow: 'none', background: 'transparent' }}
          placeholder="แจ้งอะไรผู้เข้าร่วม เช่น เปลี่ยนจุดนัดพบ สิ่งที่ต้องเตรียม"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <AnimatePresence initial={false}>
          {imgs.length > 0 && (
            <motion.div className="row gap-8 mt-8" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              {imgs.map((src, i) => (
                <div key={i} style={{ position: 'relative', width: 72, height: 72, borderRadius: 14, overflow: 'hidden', flex: 'none' }}>
                  <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    className="icon-btn glass"
                    style={{ position: 'absolute', top: 4, right: 4, width: 24, height: 24 }}
                    onClick={() => setImgs((p) => p.filter((_, j) => j !== i))}
                    aria-label="เอารูปออก"
                  >
                    <XIcon size={12} weight="bold" />
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="row between mt-8">
          <label className="row gap-6 t-small t-strong press tappable" style={{ padding: '6px 4px', cursor: 'pointer' }}>
            <ImageSquareIcon size={20} /> {busy ? 'กำลังย่อรูป' : 'แนบรูป'}
            <input type="file" accept="image/*" multiple hidden onChange={(e) => attach(e.target.files)} />
          </label>
          <button
            className="btn btn-ink btn-sm"
            disabled={!text.trim() || busy}
            onClick={() => {
              post(activityId, text.trim(), imgs)
              setText('')
              setImgs([])
              haptic.success()
              toast.success('ส่งประกาศแล้ว', { description: `แจ้งเตือนผู้ลงทะเบียน ${regCount({ registrations, extraReg }, activityId)} คน` })
            }}
          >
            โพสต์ประกาศ
          </button>
        </div>
      </div>

      <div className="stack list mt-8">
        {a.announcements.map((n) => (
          <motion.div
            key={n.id}
            className="announce"
            initial={{ opacity: 0, transform: 'translateY(-6px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.35, ease: EASE_OUT }}
          >
            <Avatar name={a.supervisor.name} size={36} sup />
            <div className="stack grow">
              <span className="t-small">{timeAgo(n.at)}</span>
              <p className="t-body prewrap">{n.text}</p>
              {n.images.length > 0 && (
                <div className={`announce-imgs ${n.images.length === 1 ? 'one' : ''}`}>
                  {n.images.map((src, i) => (
                    <button key={i} onClick={() => onImage(src)} className="press">
                      <img src={src} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {a.announcements.length === 0 && <p className="t-meta mt-8">ยังไม่มีประกาศ</p>}
      </div>
    </div>
  )
}
