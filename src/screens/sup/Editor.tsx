import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { toast } from 'sonner'
import { CrosshairIcon, ImageSquareIcon } from '@phosphor-icons/react'
import { useStore } from '../../store'
import type { Activity, Category } from '../../data/types'
import { EASE_OUT, Page, PosterCard, Segmented, Stepper, Switch, TopBar } from '../../ui/kit'
import { compressImage } from '../../lib/device'
import { fmtDay, fmtTime, uid } from '../../lib/format'
import { getFix } from '../../lib/geo'
import { CANCEL_DAYS, HOUR_LOTS } from '../../config'

const SAMPLE = ['river', 'tree', 'paint', 'camp', 'openhouse', 'mural'].map((p) => `./posters/${p}.jpg`)
const STEP_TITLES = ['ชื่อและรูปกิจกรรม', 'วัน เวลา และสถานที่', 'ชั่วโมงและการรับสมัคร', 'ติดต่อและรายละเอียด', 'ตรวจก่อนเผยแพร่']

const pad = (n: number) => String(n).padStart(2, '0')
const toDate = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const toTime = (t: number) => {
  const d = new Date(t)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function Editor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sup = useStore((s) => s.sup)!
  const existing = useStore((s) => s.activities.find((a) => a.id === id))
  const upsert = useStore((s) => s.upsertActivity)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(8, 0, 0, 0)
  const openDefault = new Date()
  openDefault.setHours(18, 0, 0, 0)
  if (openDefault.getTime() < Date.now()) openDefault.setDate(openDefault.getDate() + 1)

  const [f, setF] = useState(() => ({
    title: existing?.title ?? '',
    category: (existing?.category ?? 'volunteer') as Category,
    date: toDate(existing?.start ?? tomorrow.getTime()),
    startT: toTime(existing?.start ?? tomorrow.getTime()),
    endT: toTime(existing?.end ?? tomorrow.getTime() + 4 * 3600_000),
    place: existing?.place ?? '',
    lat: existing?.lat,
    lng: existing?.lng,
    hours: existing?.hours ?? HOUR_LOTS[1],
    capacity: existing?.capacity ?? 30,
    scheduled: !!existing?.opensAt,
    openDate: toDate(existing?.opensAt ?? openDefault.getTime()),
    openT: toTime(existing?.opensAt ?? openDefault.getTime()),
    cancelDays: existing?.cancelDays ?? CANCEL_DAYS,
    phone: existing?.supervisor.phone ?? '',
    description: existing?.description ?? '',
    chatEnabled: existing?.chatEnabled ?? false,
    openChatUrl: existing?.openChatUrl ?? '',
    poster: existing?.poster ?? '',
  }))
  const [step, setStep] = useState(0)
  const [dir, setDir] = useState(1)
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const start = new Date(`${f.date}T${f.startT}`).getTime()
  const end = new Date(`${f.date}T${f.endT}`).getTime()
  const opensAt = f.scheduled ? new Date(`${f.openDate}T${f.openT}`).getTime() : undefined
  const lots = HOUR_LOTS.includes(f.hours) ? HOUR_LOTS : [...HOUR_LOTS, f.hours].sort((x, y) => x - y)

  const problem = (i: number) => {
    if (i === 0) return !f.title.trim() ? 'ยังไม่ได้ใส่ชื่อกิจกรรม' : !f.poster ? 'ยังไม่ได้เลือกรูปกิจกรรม' : ''
    if (i === 1) return !(end > start) ? 'เวลาจบต้องหลังเวลาเริ่ม' : !f.place.trim() ? 'ยังไม่ได้ใส่สถานที่' : ''
    if (i === 2) return opensAt && opensAt >= start ? 'เวลาเปิดรับต้องก่อนวันจัดกิจกรรม' : ''
    return ''
  }

  const go = (n: number) => {
    if (n > step) {
      const p = problem(step)
      if (p) return toast.error(p)
    }
    setDir(n > step ? 1 : -1)
    setStep(n)
    document.querySelector('.page')?.scrollTo({ top: 0 })
  }

  const pick = async (file?: File) => {
    if (!file) return
    setBusy(true)
    try {
      set('poster', await compressImage(file, 1200, 0.72))
    } catch {
      toast.error('เปิดรูปนี้ไม่ได้')
    } finally {
      setBusy(false)
    }
  }

  const build = (): Activity => ({
    id: existing?.id ?? `u-${uid()}`,
    title: f.title.trim(),
    category: f.category,
    org: sup.org,
    orgCode: sup.code,
    poster: f.poster,
    description: f.description.trim(),
    place: f.place.trim(),
    lat: f.lat,
    lng: f.lng,
    start,
    end,
    hours: f.hours,
    capacity: f.capacity,
    opensAt,
    cancelDays: f.cancelDays,
    supervisor: { name: sup.name, phone: f.phone.trim() || '-' },
    chatEnabled: f.chatEnabled,
    openChatUrl: f.openChatUrl.trim() || undefined,
    announcements: existing?.announcements ?? [],
    createdAt: existing?.createdAt ?? Date.now(),
    closedAt: existing?.closedAt,
    submittedAt: existing?.submittedAt,
    recordedAt: existing?.recordedAt,
    seed: existing?.seed,
  })

  const save = () => {
    const a = build()
    upsert(a, !existing)
    toast.success(existing ? 'บันทึกการแก้ไขแล้ว' : 'เผยแพร่กิจกรรมแล้ว', {
      description: existing
        ? undefined
        : opensAt
          ? `นิสิตเห็นล่วงหน้า และสมัครได้ตั้งแต่ ${fmtDay(opensAt)} ${fmtTime(opensAt)} น.`
          : 'นิสิตที่เปิดแจ้งเตือนจะเห็นกิจกรรมนี้ทันที',
    })
    navigate(`/sup/a/${a.id}`, { replace: true })
  }

  const last = step === 4
  return (
    <>
      <Page>
        <TopBar title={existing ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรม'} fallback="/sup" />
        <div className="pad sup" style={{ paddingBottom: 'calc(120px + var(--safe-bottom))' }}>
          <div className="wizard-steps" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <i key={i} className={i <= step ? 'on' : ''} />
            ))}
          </div>
          <p className="t-meta mt-12">{last ? 'ขั้นสุดท้าย' : `ขั้นที่ ${step + 1} จาก 4`}</p>
          <h1 className="t-title">{STEP_TITLES[step]}</h1>

          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={step}
              className="stack gap-24 mt-24"
              initial={{ opacity: 0, transform: `translateX(${dir * 24}px)` }}
              animate={{ opacity: 1, transform: 'translateX(0px)' }}
              exit={{ opacity: 0, transform: `translateX(${dir * -24}px)` }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
            >
              {step === 0 && (
                <>
                  <div className="field">
                    <label htmlFor="t">ชื่อกิจกรรม</label>
                    <input id="t" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="เช่น เก็บขยะริมแม่น้ำน่าน" />
                  </div>
                  <div className="field">
                    <span className="field-label">ประเภทชั่วโมง</span>
                    <Segmented
                      id="ed-cat"
                      value={f.category}
                      onChange={(v) => set('category', v)}
                      options={[
                        { value: 'volunteer', label: 'จิตอาสา' },
                        { value: 'faculty', label: 'กิจกรรมคณะ' },
                      ]}
                    />
                  </div>
                  <div className="stack gap-10">
                    <span className="field-label">รูปหรือโปสเตอร์</span>
                    <label className="upload-box press tappable">
                      {f.poster ? (
                        <img src={f.poster} alt="" />
                      ) : (
                        <div className="stack gap-8" style={{ alignItems: 'center' }}>
                          <ImageSquareIcon size={32} />
                          <span className="t-strong">{busy ? 'กำลังย่อรูป' : 'แตะเพื่อเลือกรูป'}</span>
                          <span className="t-small">หรือเลือกรูปตัวอย่างด้านล่าง</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
                    </label>
                    <div className="row gap-8" style={{ overflowX: 'auto', paddingBottom: 4 }}>
                      {SAMPLE.map((src) => (
                        <button
                          key={src}
                          type="button"
                          onClick={() => set('poster', src)}
                          className="press"
                          style={{
                            width: 64,
                            height: 44,
                            borderRadius: 10,
                            overflow: 'hidden',
                            flex: 'none',
                            outline: f.poster === src ? '2px solid var(--accent)' : 'none',
                            outlineOffset: 2,
                          }}
                          aria-label="ใช้รูปตัวอย่าง"
                        >
                          <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <div className="field">
                    <label htmlFor="d">วันที่จัด</label>
                    <input id="d" type="date" className="input" value={f.date} onChange={(e) => set('date', e.target.value)} />
                  </div>
                  <div className="row gap-12">
                    <div className="field grow">
                      <label htmlFor="st">เริ่ม</label>
                      <input id="st" type="time" className="input" value={f.startT} onChange={(e) => set('startT', e.target.value)} />
                    </div>
                    <div className="field grow">
                      <label htmlFor="et">จบ</label>
                      <input id="et" type="time" className="input" value={f.endT} onChange={(e) => set('endT', e.target.value)} />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="pl">สถานที่</label>
                    <input id="pl" className="input" value={f.place} onChange={(e) => set('place', e.target.value)} placeholder="เช่น ลานกิจกรรมคณะวิทยาศาสตร์" />
                    <button
                      type="button"
                      className="row gap-6 t-small t-strong t-accent"
                      style={{ alignSelf: 'flex-start', padding: '4px 0' }}
                      onClick={async () => {
                        try {
                          const fix = await getFix()
                          setF((p) => ({ ...p, lat: fix.lat, lng: fix.lng }))
                          toast.success('ปักหมุดตำแหน่งปัจจุบันแล้ว')
                        } catch {
                          toast.error('หาตำแหน่งไม่ได้')
                        }
                      }}
                    >
                      <CrosshairIcon size={16} weight="bold" />
                      {f.lat != null ? 'ปักหมุดแล้ว แตะเพื่อใช้ตำแหน่งปัจจุบันแทน' : 'ใช้ตำแหน่งปัจจุบันเป็นจุดนัดพบ'}
                    </button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="stack gap-10">
                    <span className="t-strong">ชั่วโมงที่ได้รับ</span>
                    <div className="lot-grid" role="radiogroup" aria-label="ชั่วโมงที่ได้รับ">
                      {lots.map((h) => (
                        <button key={h} type="button" role="radio" aria-checked={f.hours === h} className={`lot press ${f.hours === h ? 'on' : ''}`} onClick={() => set('hours', h)}>
                          <span className="num">{h}</span>
                          <span>ชั่วโมง</span>
                        </button>
                      ))}
                    </div>
                    <span className="t-small">ชั่วโมงตรงกับล็อตในระบบบันทึกของมหาวิทยาลัย ศูนย์จิตอาสาบันทึกได้ทันที</span>
                  </div>
                  <div className="row between">
                    <div className="stack">
                      <span className="t-strong">จำนวนที่รับ</span>
                      <span className="t-small">ครบแล้วปิดรับอัตโนมัติ</span>
                    </div>
                    <Stepper value={f.capacity} step={5} min={5} max={1000} onChange={(v) => set('capacity', v)} />
                  </div>
                  <div className="card stack" style={{ padding: 16 }}>
                    <div className="row gap-12">
                      <div className="stack grow">
                        <span className="t-strong">ตั้งเวลาเปิดรับสมัคร</span>
                        <span className="t-small">นิสิตเห็นกิจกรรมล่วงหน้า แต่กดสมัครได้เมื่อถึงเวลา</span>
                      </div>
                      <Switch label="ตั้งเวลาเปิดรับสมัคร" checked={f.scheduled} onChange={(v) => set('scheduled', v)} />
                    </div>
                    {f.scheduled && (
                      <div className="row gap-12 mt-16">
                        <div className="field grow">
                          <label htmlFor="od">วันที่เปิดรับ</label>
                          <input id="od" type="date" className="input" value={f.openDate} onChange={(e) => set('openDate', e.target.value)} />
                        </div>
                        <div className="field" style={{ width: 140 }}>
                          <label htmlFor="ot">เวลา</label>
                          <input id="ot" type="time" className="input" value={f.openT} onChange={(e) => set('openT', e.target.value)} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="row between">
                    <div className="stack" style={{ maxWidth: '60%' }}>
                      <span className="t-strong">ยกเลิกฟรีถึงก่อนวันงาน</span>
                      <span className="t-small">ยกเลิกหลังจากนี้นิสิตจะถูกหักเครดิต</span>
                    </div>
                    <Stepper value={f.cancelDays} step={1} min={0} max={14} onChange={(v) => set('cancelDays', v)} format={(v) => (v === 0 ? 'วันงาน' : `${v} วัน`)} />
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="field">
                    <label htmlFor="ph">เบอร์ติดต่อผู้คุม</label>
                    <input id="ph" type="tel" inputMode="tel" className="input num" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
                    <span className="field-help">นิสิตที่สมัครแล้วจะเห็นเบอร์นี้ ไม่ต้องถามในเพจ</span>
                  </div>
                  <div className="field">
                    <label htmlFor="ds">รายละเอียด</label>
                    <textarea
                      id="ds"
                      className="input"
                      value={f.description}
                      onChange={(e) => set('description', e.target.value)}
                      placeholder="ทำอะไร เตรียมอะไรมา แต่งกายอย่างไร"
                    />
                  </div>
                  <div className="card stack list" style={{ padding: '0 16px' }}>
                    <div className="row gap-12" style={{ padding: '14px 0' }}>
                      <div className="stack grow">
                        <span className="t-strong">เปิดห้องแชทกิจกรรม</span>
                        <span className="t-small">เหมาะกับกิจกรรมใหญ่ เข้าได้เฉพาะคนที่ลงทะเบียน</span>
                      </div>
                      <Switch label="เปิดห้องแชท" checked={f.chatEnabled} onChange={(v) => set('chatEnabled', v)} />
                    </div>
                    <div className="field" style={{ padding: '14px 0' }}>
                      <label htmlFor="oc">ลิงก์ LINE OpenChat (ถ้ามี)</label>
                      <input id="oc" className="input" inputMode="url" autoCapitalize="none" value={f.openChatUrl} onChange={(e) => set('openChatUrl', e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <p className="t-meta">นิสิตจะเห็นการ์ดแบบนี้ในหน้าแรก</p>
                  <div className="preview-frame" aria-hidden>
                    <PosterCard a={build()} registered={false} credited={false} seatsLeft={f.capacity} />
                  </div>
                  <div className="card stack list" style={{ padding: '0 16px' }}>
                    <Summary label="ชั่วโมง" value={`${f.hours} ชั่วโมง${f.category === 'volunteer' ? 'จิตอาสา' : 'กิจกรรมคณะ'}`} onEdit={() => go(2)} />
                    <Summary label="รับ" value={`${f.capacity} คน`} onEdit={() => go(2)} />
                    <Summary
                      label="เปิดรับสมัคร"
                      value={opensAt ? `${fmtDay(opensAt)} ${fmtTime(opensAt)} น.` : 'ทันทีที่เผยแพร่'}
                      onEdit={() => go(2)}
                    />
                    <Summary label="ยกเลิกได้ถึง" value={f.cancelDays === 0 ? 'ก่อนเริ่มงาน' : `${f.cancelDays} วันก่อนกิจกรรม`} onEdit={() => go(2)} />
                    <Summary label="ติดต่อ" value={f.phone.trim() || 'ยังไม่ได้ใส่เบอร์'} onEdit={() => go(3)} />
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </Page>
      <div className="bottom-cta row gap-8">
        {step > 0 && (
          <button className="btn btn-soft" style={{ flex: '0 0 34%' }} onClick={() => go(step - 1)}>
            ย้อนกลับ
          </button>
        )}
        {last ? (
          <button className="btn btn-ink grow" onClick={save} disabled={busy}>
            {existing ? 'บันทึกการแก้ไข' : 'เผยแพร่กิจกรรม'}
          </button>
        ) : (
          <button className="btn btn-ink grow" onClick={() => go(step + 1)} disabled={busy}>
            {step === 3 ? 'ดูตัวอย่าง' : 'ถัดไป'}
          </button>
        )}
      </div>
    </>
  )
}

function Summary({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="row between gap-12" style={{ padding: '12px 0' }}>
      <span className="t-meta">{label}</span>
      <span className="row gap-10" style={{ minWidth: 0 }}>
        <span className="t-strong clamp-1">{value}</span>
        <button className="t-small t-strong t-accent" onClick={onEdit} style={{ padding: '4px 0' }}>
          แก้
        </button>
      </span>
    </div>
  )
}
