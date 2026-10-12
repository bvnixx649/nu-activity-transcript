import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import {
  CaretRightIcon,
  ChatCircleDotsIcon,
  FileXlsIcon,
  ImageSquareIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  QrCodeIcon,
  UserPlusIcon,
  XIcon,
} from '@phosphor-icons/react'
import { useStore, regCount } from '../../store'
import type { Student } from '../../data/types'
import { FACULTIES } from '../../data/seed'
import { Avatar, EASE_OUT, Empty, Lightbox, Page, Segmented, Sheet, TopBar } from '../../ui/kit'
import { CAT_LABEL, fmtDate, fmtDay, fmtHours, fmtRange, fmtTime, phase, timeAgo } from '../../lib/format'
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
  const ph = phase(a)

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

          <button className="btn btn-accent btn-block mt-16" onClick={() => navigate(`/sup/a/${a.id}/qr`)}>
            <QrCodeIcon size={20} weight="bold" /> เปิด QR รับชั่วโมง
          </button>
          {ph === 'upcoming' && <p className="t-small mt-8" style={{ textAlign: 'center' }}>เปิดได้ทุกเมื่อ ปกติเปิดตอนจบกิจกรรมให้นิสิตต่อแถวสแกน</p>}

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
                <button className="icon-btn" style={{ width: 44, height: 44 }} onClick={() => setAdding(true)} aria-label="เพิ่มนิสิต">
                  <UserPlusIcon size={20} />
                </button>
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
                    onClick={() => setPicked(r.s)}
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
            </div>
          ) : (
            <Posts activityId={a.id} onImage={setLightbox} />
          )}
        </div>
      </Page>

      <RosterActions student={picked} activityId={a.id} hours={a.hours} onClose={() => setPicked(null)} />
      <AddStudent open={adding} activityId={a.id} onClose={() => setAdding(false)} />
      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </>
  )
}

function RosterActions({ student, activityId, hours, onClose }: { student: Student | null; activityId: string; hours: number; onClose: () => void }) {
  const credits = useStore((s) => s.credits)
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
