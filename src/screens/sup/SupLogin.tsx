import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { useStore } from '../../store'
import { ORGS } from '../../data/seed'
import { EASE_OUT, Page, TopBar } from '../../ui/kit'
import { haptic } from '../../lib/device'

const DEMO = ['NUVOL26', 'SCI2569']

export default function SupLogin() {
  const navigate = useNavigate()
  const me = useStore((s) => s.me)
  const students = useStore((s) => s.students)
  const supLogin = useStore((s) => s.supLogin)
  const [name, setName] = useState(me ? students[me]?.name ?? '' : '')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [shake, setShake] = useState(0)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (supLogin(code, name)) {
      haptic.success()
      navigate('/sup', { replace: true })
    } else {
      haptic.error()
      setErr('ไม่พบรหัสหน่วยงานนี้ ตรวจสอบกับกองกิจการนิสิตอีกครั้ง')
      setShake((k) => k + 1)
    }
  }

  return (
    <Page>
      <TopBar fallback={me ? '/me' : '/welcome'} />
      <form className="pad stack gap-24" onSubmit={submit} style={{ paddingBottom: 40 }}>
        <div className="stack gap-8">
          <h1 className="t-title">โหมดผู้คุมกิจกรรม</h1>
          <p className="t-meta">ใช้รหัสหน่วยงานที่ได้รับจากกองกิจการนิสิต เพื่อโพสต์กิจกรรม ส่งประกาศ และเปิด QR ให้นิสิตรับชั่วโมง</p>
        </div>
        <div className="field">
          <label htmlFor="sname">ชื่อผู้คุมกิจกรรม</label>
          <input id="sname" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>
        <motion.div className="field" key={shake} animate={shake ? { x: [0, -10, 8, -6, 4, 0] } : undefined} transition={{ duration: 0.4 }}>
          <label htmlFor="code">รหัสหน่วยงาน</label>
          <input
            id="code"
            className="input num"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setErr('')
            }}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            style={{ letterSpacing: '0.08em', fontWeight: 600 }}
          />
          {err && <span className="field-error">{err}</span>}
        </motion.div>

        <div className="stack gap-8">
          <span className="field-label">รหัสสำหรับทดลอง</span>
          <div className="row gap-8 wrap">
            {DEMO.map((c, i) => (
              <motion.button
                key={c}
                type="button"
                className="chip press"
                style={{ height: 'auto', padding: '8px 14px', flexDirection: 'column', alignItems: 'flex-start', gap: 0, borderRadius: 16 }}
                onClick={() => {
                  setCode(c)
                  setErr('')
                }}
                initial={{ opacity: 0, transform: 'translateY(6px)' }}
                animate={{ opacity: 1, transform: 'translateY(0px)' }}
                transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.1 + i * 0.05 }}
              >
                <span className="num">{c}</span>
                <span className="t-small" style={{ fontWeight: 500 }}>
                  {ORGS[c]}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <button className="btn btn-ink btn-block mt-8" disabled={code.trim().length < 4 || !name.trim()}>
          เข้าสู่โหมดผู้คุม
        </button>
      </form>
    </Page>
  )
}
