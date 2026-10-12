import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { CrosshairIcon, ImageSquareIcon } from '@phosphor-icons/react'
import { useStore } from '../../store'
import type { Activity, Category } from '../../data/types'
import { Page, Segmented, Stepper, Switch, TopBar } from '../../ui/kit'
import { compressImage } from '../../lib/device'
import { fmtHours, uid } from '../../lib/format'
import { getFix } from '../../lib/geo'

const SAMPLE = ['river', 'tree', 'paint', 'camp', 'openhouse', 'mural'].map((p) => `./posters/${p}.jpg`)

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

  const [f, setF] = useState(() => ({
    title: existing?.title ?? '',
    category: (existing?.category ?? 'volunteer') as Category,
    date: toDate(existing?.start ?? tomorrow.getTime()),
    startT: toTime(existing?.start ?? tomorrow.getTime()),
    endT: toTime(existing?.end ?? tomorrow.getTime() + 4 * 3600_000),
    place: existing?.place ?? '',
    lat: existing?.lat,
    lng: existing?.lng,
    hours: existing?.hours ?? 3,
    capacity: existing?.capacity ?? 30,
    phone: existing?.supervisor.phone ?? '',
    description: existing?.description ?? '',
    chatEnabled: existing?.chatEnabled ?? false,
    openChatUrl: existing?.openChatUrl ?? '',
    poster: existing?.poster ?? '',
  }))
  const [busy, setBusy] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }))

  const start = new Date(`${f.date}T${f.startT}`).getTime()
  const end = new Date(`${f.date}T${f.endT}`).getTime()
  const missing = !f.title.trim() ? 'ชื่อกิจกรรม' : !f.poster ? 'รูปกิจกรรม' : !f.place.trim() ? 'สถานที่' : !(end > start) ? 'เวลาจบต้องหลังเวลาเริ่ม' : ''

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

  const save = () => {
    if (missing) {
      toast.error(missing.startsWith('เวลา') ? missing : `ยังไม่ได้ใส่${missing}`)
      return
    }
    const a: Activity = {
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
      supervisor: { name: sup.name, phone: f.phone.trim() || '-' },
      chatEnabled: f.chatEnabled,
      openChatUrl: f.openChatUrl.trim() || undefined,
      announcements: existing?.announcements ?? [],
      createdAt: existing?.createdAt ?? Date.now(),
      seed: existing?.seed,
    }
    upsert(a, !existing)
    toast.success(existing ? 'บันทึกการแก้ไขแล้ว' : 'เผยแพร่กิจกรรมแล้ว', {
      description: existing ? undefined : 'นิสิตที่เปิดแจ้งเตือนจะเห็นกิจกรรมนี้ทันที',
    })
    navigate(`/sup/a/${a.id}`, { replace: true })
  }

  return (
    <>
      <Page>
        <TopBar title={existing ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรม'} fallback="/sup" />
        <div className="pad stack gap-24" style={{ paddingBottom: 'calc(120px + var(--safe-bottom))' }}>
          <h1 className="t-title">{existing ? 'แก้ไขกิจกรรม' : 'สร้างกิจกรรม'}</h1>

          <div className="stack gap-10">
            <label className="upload-box press tappable">
              {f.poster ? (
                <img src={f.poster} alt="" />
              ) : (
                <div className="stack gap-8" style={{ alignItems: 'center' }}>
                  <ImageSquareIcon size={32} />
                  <span className="t-strong">{busy ? 'กำลังย่อรูป' : 'เพิ่มรูปหรือโปสเตอร์กิจกรรม'}</span>
                  <span className="t-small">รูปจะถูกย่อให้เล็กลงก่อนอัปโหลด</span>
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

          <div className="field">
            <label htmlFor="t">ชื่อกิจกรรม</label>
            <input id="t" className="input" value={f.title} onChange={(e) => set('title', e.target.value)} />
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

          <div className="field">
            <label htmlFor="d">วันที่</label>
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
            <input id="pl" className="input" value={f.place} onChange={(e) => set('place', e.target.value)} />
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

          <div className="row between">
            <div className="stack">
              <span className="t-strong">ชั่วโมงที่ได้รับ</span>
              <span className="t-small">ปรับทีละครึ่งชั่วโมง</span>
            </div>
            <Stepper value={f.hours} step={0.5} min={0.5} max={48} onChange={(v) => set('hours', v)} format={fmtHours} />
          </div>
          <div className="row between">
            <div className="stack">
              <span className="t-strong">จำนวนที่รับ</span>
              <span className="t-small">ครบแล้วปิดรับอัตโนมัติ</span>
            </div>
            <Stepper value={f.capacity} step={5} min={5} max={1000} onChange={(v) => set('capacity', v)} />
          </div>

          <div className="field">
            <label htmlFor="ph">เบอร์ติดต่อผู้คุม</label>
            <input id="ph" type="tel" inputMode="tel" className="input num" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="ds">รายละเอียด</label>
            <textarea id="ds" className="input" value={f.description} onChange={(e) => set('description', e.target.value)} />
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
              <input
                id="oc"
                className="input"
                inputMode="url"
                autoCapitalize="none"
                value={f.openChatUrl}
                onChange={(e) => set('openChatUrl', e.target.value)}
              />
            </div>
          </div>
        </div>
      </Page>
      <div className="bottom-cta">
        <button className="btn btn-ink btn-block" onClick={save} disabled={busy}>
          {existing ? 'บันทึกการแก้ไข' : 'เผยแพร่กิจกรรม'}
        </button>
      </div>
    </>
  )
}
