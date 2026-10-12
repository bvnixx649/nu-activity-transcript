import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { CaretLeftIcon } from '@phosphor-icons/react'
import { useStore } from '../../store'
import { FACULTIES } from '../../data/seed'
import { EASE_OUT, Page, PinPad } from '../../ui/kit'
import { haptic } from '../../lib/device'

type Step = 'intro' | 'profile' | 'pin' | 'confirm' | 'login-id' | 'login-pin'

const STACK = ['./posters/river.jpg', './posters/grad.jpg', './posters/teach.jpg']

export default function Welcome() {
  const navigate = useNavigate()
  const signUp = useStore((s) => s.signUp)
  const login = useStore((s) => s.login)
  const [step, setStep] = useState<Step>('intro')
  const [name, setName] = useState('')
  const [sid, setSid] = useState('')
  const [faculty, setFaculty] = useState(FACULTIES[0])
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [shake, setShake] = useState(0)
  const [err, setErr] = useState('')

  const sidOk = /^\d{8}$/.test(sid)
  const nameOk = name.trim().split(/\s+/).length >= 2

  const finish = () => {
    const pending = sessionStorage.getItem('nuat-pending-claim')
    sessionStorage.removeItem('nuat-pending-claim')
    navigate(pending ? `/claim${pending}` : '/', { replace: true })
  }

  const back = () => {
    setErr('')
    setStep((s) =>
      s === 'profile' || s === 'login-id' ? 'intro' : s === 'pin' ? 'profile' : s === 'confirm' ? 'pin' : s === 'login-pin' ? 'login-id' : s,
    )
    setPin('')
    setPin2('')
  }

  const onPin = (v: string) => {
    setPin(v)
    if (v.length === 6) setTimeout(() => setStep('confirm'), 160)
  }
  const onPin2 = (v: string) => {
    setPin2(v)
    if (v.length < 6) return
    if (v === pin) {
      haptic.success()
      signUp({ id: sid, name: name.trim().replace(/\s+/g, ' '), faculty, pin })
      setTimeout(finish, 120)
    } else {
      haptic.error()
      setErr('PIN ไม่ตรงกัน ลองอีกครั้ง')
      setShake((k) => k + 1)
      setTimeout(() => setPin2(''), 380)
    }
  }
  const onLoginPin = (v: string) => {
    setPin(v)
    if (v.length < 6) return
    const r = login(sid, v)
    if (r === 'ok') {
      haptic.success()
      setTimeout(finish, 120)
      return
    }
    haptic.error()
    setErr(r === 'unknown' ? 'ไม่พบบัญชีนี้ในเครื่อง ข้อมูลเดโมเก็บแยกในแต่ละเครื่อง' : 'PIN ไม่ถูกต้อง')
    setShake((k) => k + 1)
    setTimeout(() => setPin(''), 380)
  }

  return (
    <Page>
      <div className="stack" style={{ minHeight: '100%' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="stack grow"
            initial={{ opacity: 0, transform: 'translateX(24px)' }}
            animate={{ opacity: 1, transform: 'translateX(0px)' }}
            exit={{ opacity: 0, transform: 'translateX(-24px)' }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            style={{ minHeight: '100dvh' }}
          >
            {step === 'intro' ? (
              <Intro onStart={() => setStep('profile')} onLogin={() => setStep('login-id')} onSup={() => navigate('/sup/login')} />
            ) : (
              <div className="stack grow safe-top pad" style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}>
                <button className="icon-btn" onClick={back} aria-label="ย้อนกลับ" style={{ marginLeft: -4 }}>
                  <CaretLeftIcon size={22} weight="bold" />
                </button>

                {step === 'profile' && (
                  <form
                    className="stack gap-24 mt-24 grow"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (sidOk && nameOk) setStep('pin')
                    }}
                  >
                    <div className="stack gap-8">
                      <h1 className="t-title">ข้อมูลนิสิต</h1>
                      <p className="t-meta">กรอกครั้งเดียว ผู้คุมกิจกรรมจะเห็นชื่อและรหัสนี้ในรายชื่อผู้เข้าร่วม</p>
                    </div>
                    <div className="field">
                      <label htmlFor="name">ชื่อ-นามสกุล</label>
                      <input id="name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" enterKeyHint="next" />
                    </div>
                    <div className="field">
                      <label htmlFor="sid">รหัสนิสิต</label>
                      <input
                        id="sid"
                        className="input num"
                        inputMode="numeric"
                        maxLength={8}
                        value={sid}
                        onChange={(e) => setSid(e.target.value.replace(/\D/g, ''))}
                        enterKeyHint="next"
                      />
                      {sid.length > 0 && !sidOk && <span className="field-help">รหัสนิสิต 8 หลัก</span>}
                    </div>
                    <div className="field">
                      <label htmlFor="fac">คณะ</label>
                      <select id="fac" className="input" value={faculty} onChange={(e) => setFaculty(e.target.value)}>
                        {FACULTIES.map((f) => (
                          <option key={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grow" />
                    <button className="btn btn-ink btn-block" disabled={!sidOk || !nameOk}>
                      ถัดไป
                    </button>
                  </form>
                )}

                {(step === 'pin' || step === 'confirm' || step === 'login-pin') && (
                  <div className="stack gap-32 mt-24 grow">
                    <div className="stack gap-8">
                      <h1 className="t-title">
                        {step === 'pin' ? 'ตั้ง PIN 6 หลัก' : step === 'confirm' ? 'ยืนยัน PIN อีกครั้ง' : 'ใส่ PIN'}
                      </h1>
                      <p className="t-meta">
                        {step === 'login-pin'
                          ? `รหัสนิสิต ${sid}`
                          : 'ใช้ PIN นี้คู่กับรหัสนิสิตเมื่อเปลี่ยนเครื่อง ชั่วโมงที่สะสมไว้จะไม่หาย'}
                      </p>
                    </div>
                    <div className="grow" />
                    <PinPad
                      value={step === 'confirm' ? pin2 : pin}
                      onChange={step === 'pin' ? onPin : step === 'confirm' ? onPin2 : onLoginPin}
                      shakeKey={shake}
                    />
                    <p className="t-small t-danger" style={{ textAlign: 'center', minHeight: 20 }}>
                      {err}
                    </p>
                  </div>
                )}

                {step === 'login-id' && (
                  <form
                    className="stack gap-24 mt-24 grow"
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (sidOk) {
                        setPin('')
                        setStep('login-pin')
                      }
                    }}
                  >
                    <div className="stack gap-8">
                      <h1 className="t-title">เข้าสู่ระบบ</h1>
                      <p className="t-meta">ใช้รหัสนิสิตและ PIN ที่ตั้งไว้ตอนลงกิจกรรมครั้งแรก</p>
                    </div>
                    <div className="field">
                      <label htmlFor="lsid">รหัสนิสิต</label>
                      <input
                        id="lsid"
                        className="input num"
                        inputMode="numeric"
                        maxLength={8}
                        value={sid}
                        onChange={(e) => setSid(e.target.value.replace(/\D/g, ''))}
                        autoFocus
                      />
                    </div>
                    <div className="grow" />
                    <button className="btn btn-ink btn-block" disabled={!sidOk}>
                      ถัดไป
                    </button>
                  </form>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Page>
  )
}

function Intro({ onStart, onLogin, onSup }: { onStart: () => void; onLogin: () => void; onSup: () => void }) {
  const rot = [-9, 6, -2]
  const off = [
    { x: -46, y: 24 },
    { x: 46, y: 8 },
    { x: 0, y: -20 },
  ]
  return (
    <div className="stack grow" style={{ paddingBottom: 'calc(var(--safe-bottom) + 20px)' }}>
      <motion.div
        className="row gap-10 pad"
        style={{ marginTop: 'calc(var(--safe-top) + 14px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <img src="./nu-emblem.png" width={38} height={38} alt="ตรามหาวิทยาลัยนเรศวร" />
        <div className="stack" style={{ lineHeight: 1.25 }}>
          <span className="t-strong" style={{ fontSize: 15 }}>
            NU Activity Transcript
          </span>
          <span className="t-small">มหาวิทยาลัยนเรศวร</span>
        </div>
      </motion.div>
      <div style={{ position: 'relative', height: 'min(44dvh, 360px)', marginTop: 8 }}>
        {STACK.map((src, i) => (
          <motion.div
            key={src}
            initial={{ opacity: 0, y: 60, rotate: 0, scale: 0.9 }}
            animate={{ opacity: 1, y: off[i].y, x: off[i].x, rotate: rot[i], scale: 1 }}
            transition={{ type: 'spring', duration: 0.9, bounce: 0.22, delay: 0.08 + i * 0.09 }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 'min(52vw, 220px)',
              marginLeft: 'calc(min(52vw, 220px) / -2)',
              marginTop: -150,
              aspectRatio: '3 / 4',
              borderRadius: 24,
              overflow: 'hidden',
              boxShadow: 'var(--shadow-2)',
              border: '4px solid var(--surface)',
              background: 'var(--fill)',
            }}
          >
            <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </motion.div>
        ))}
      </div>

      <div className="pad stack gap-12 mt-16">
        <motion.h1
          className="t-display"
          initial={{ opacity: 0, transform: 'translateY(12px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.6, ease: EASE_OUT, delay: 0.35 }}
        >
          ไม่พลาดกิจกรรมจิตอาสา
          <br />
          <span className="t-accent">รับชั่วโมงในสแกนเดียว</span>
        </motion.h1>
        <motion.p
          className="t-meta"
          style={{ fontSize: 16 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          ดูกิจกรรมที่เปิดรับ ลงทะเบียน แล้วสแกน QR จากผู้คุมเพื่อรับชั่วโมงได้ทันที
        </motion.p>
      </div>

      <div className="grow" />
      <div className="pad stack gap-8 mt-24">
        <button className="btn btn-ink btn-block" onClick={onStart}>
          เริ่มใช้งาน
        </button>
        <button className="btn btn-ghost btn-block" onClick={onLogin}>
          มีบัญชีอยู่แล้ว
        </button>
        <button className="t-small t-faint" style={{ alignSelf: 'center', padding: 8 }} onClick={onSup}>
          สำหรับผู้คุมกิจกรรม
        </button>
      </div>
    </div>
  )
}
