import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, animate, motion, useDragControls, useMotionValue, useTransform } from 'motion/react'
import { BackspaceIcon, CaretLeftIcon, MapPinIcon } from '@phosphor-icons/react'
import { haptic } from '../lib/device'
import { fmtDay, fmtHours, fmtTime, hueOf, initials } from '../lib/format'
import type { Activity } from '../data/types'

export const EASE_OUT = [0.23, 1, 0.32, 1] as const
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const

/* ───────── Page: scroll container with per-route scroll memory ───────── */

const ScrollCtx = createContext<RefObject<HTMLDivElement | null> | null>(null)
const scrollMemory = new Map<string, number>()

export function Page({
  children,
  className = '',
  memoryKey,
  tabbar = false,
}: {
  children: ReactNode
  className?: string
  memoryKey?: string
  tabbar?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || !memoryKey) return
    el.scrollTop = scrollMemory.get(memoryKey) ?? 0
    return () => {
      scrollMemory.set(memoryKey, el.scrollTop)
    }
  }, [memoryKey])
  return (
    <ScrollCtx.Provider value={ref}>
      <div ref={ref} className={`page ${tabbar ? 'has-tabbar' : ''} ${className}`}>
        {children}
      </div>
    </ScrollCtx.Provider>
  )
}

export function useScrollY(threshold = 8) {
  const ref = useContext(ScrollCtx)
  const [past, setPast] = useState(false)
  useEffect(() => {
    const el = ref?.current
    if (!el) return
    const on = () => setPast(el.scrollTop > threshold)
    on()
    el.addEventListener('scroll', on, { passive: true })
    return () => el.removeEventListener('scroll', on)
  }, [ref, threshold])
  return past
}

export function useScrollEl() {
  return useContext(ScrollCtx)
}

/* ───────── navigation ───────── */

export function useBack(fallback = '/') {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}

export function BackButton({ fallback = '/', glass = false }: { fallback?: string; glass?: boolean }) {
  const back = useBack(fallback)
  return (
    <button className={`icon-btn ${glass ? 'glass' : 'plain'}`} onClick={back} aria-label="ย้อนกลับ">
      <CaretLeftIcon size={22} weight="bold" />
    </button>
  )
}

export function TopBar({
  title,
  fallback = '/',
  end,
  back = true,
  alwaysTitle = false,
}: {
  title?: ReactNode
  fallback?: string
  end?: ReactNode
  back?: boolean
  alwaysTitle?: boolean
}) {
  const solid = useScrollY(6)
  return (
    <header className="topbar" data-solid={solid}>
      <div>{back && <BackButton fallback={fallback} />}</div>
      <div className={`topbar-title ${alwaysTitle ? 'always' : ''}`}>{title}</div>
      <div className="topbar-end">{end}</div>
    </header>
  )
}

/* ───────── bottom sheet ───────── */

export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const controls = useDragControls()
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            className="sheet"
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%', transition: { duration: 0.28, ease: EASE_DRAWER } }}
            transition={{ duration: 0.46, ease: EASE_DRAWER }}
            drag="y"
            dragListener={false}
            dragControls={controls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.8 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 550) onClose()
            }}
          >
            <div className="sheet-grab" onPointerDown={(e) => controls.start(e)}>
              <i />
            </div>
            <div className="sheet-body">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body,
  )
}

/* ───────── controls ───────── */

export function Segmented<T extends string>({
  id,
  options,
  value,
  onChange,
}: {
  id: string
  options: { value: T; label: ReactNode }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button
          key={o.value}
          aria-pressed={o.value === value}
          onClick={() => {
            if (o.value !== value) haptic.tap()
            onChange(o.value)
          }}
        >
          {o.value === value && (
            <motion.i layoutId={`seg-${id}`} className="seg-pill" transition={{ type: 'spring', bounce: 0.14, duration: 0.42 }} />
          )}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="switch"
      onClick={() => {
        haptic.tap()
        onChange(!checked)
      }}
    >
      <i />
    </button>
  )
}

export function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 999,
  format = (v: number) => String(v),
}: {
  value: number
  onChange: (v: number) => void
  step?: number
  min?: number
  max?: number
  format?: (v: number) => string
}) {
  const set = (v: number) => {
    haptic.tap()
    onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)))
  }
  return (
    <div className="stepper">
      <button type="button" onClick={() => set(value - step)} aria-label="ลด">
        −
      </button>
      <span className="num">{format(value)}</span>
      <button type="button" onClick={() => set(value + step)} aria-label="เพิ่ม">
        +
      </button>
    </div>
  )
}

export function Avatar({ name, size = 40, sup = false }: { name: string; size?: number; sup?: boolean }) {
  const hue = hueOf(name)
  return (
    <div
      className="avatar"
      aria-hidden
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: sup ? 'var(--accent)' : `hsl(${hue} 32% 52%)`,
      }}
    >
      {initials(name)}
    </div>
  )
}

/* ───────── PIN ───────── */

export function PinPad({
  value,
  onChange,
  length = 6,
  shakeKey = 0,
}: {
  value: string
  onChange: (v: string) => void
  length?: number
  shakeKey?: number
}) {
  const press = (k: string) => {
    haptic.tap()
    if (k === 'del') onChange(value.slice(0, -1))
    else if (value.length < length) onChange(value + k)
  }
  return (
    <div className="stack gap-32">
      <motion.div
        key={shakeKey}
        className="pin-dots"
        animate={shakeKey ? { x: [0, -12, 10, -8, 6, -3, 0] } : undefined}
        transition={{ duration: 0.42 }}
      >
        {Array.from({ length }, (_, i) => (
          <i key={i} data-on={i < value.length} />
        ))}
      </motion.div>
      <div className="keypad">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
          k === '' ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className={`key num ${k === 'del' ? 'blank' : ''}`}
              onClick={() => press(k)}
              aria-label={k === 'del' ? 'ลบ' : k}
            >
              {k === 'del' ? <BackspaceIcon size={26} /> : k}
            </button>
          ),
        )}
      </div>
    </div>
  )
}

/* ───────── numbers ───────── */

export function CountUp({ value, decimals = 0, delay = 0 }: { value: number; decimals?: number; delay?: number }) {
  const mv = useMotionValue(0)
  const text = useTransform(mv, (v) => v.toFixed(decimals))
  useEffect(() => {
    const c = animate(mv, value, { duration: 1.1, ease: EASE_OUT, delay })
    return () => c.stop()
  }, [mv, value, delay])
  return <motion.span>{text}</motion.span>
}

/* ───────── activity card ───────── */

export function PosterCard({
  a,
  registered,
  seatsLeft,
  credited,
  index = 0,
}: {
  a: Activity
  registered: boolean
  seatsLeft: number
  credited: boolean
  index?: number
}) {
  const full = seatsLeft <= 0
  return (
    <motion.div
      initial={{ opacity: 0, transform: 'translateY(14px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.5, ease: EASE_OUT, delay: Math.min(index, 6) * 0.05 }}
    >
      <Link to={`/a/${a.id}`} className="pcard press">
        <div className="pcard-img">
          <img src={a.poster} alt="" loading={index > 1 ? 'lazy' : 'eager'} />
        </div>
        <div className="pcard-body stack gap-4">
          <div className="t-small t-strong t-accent">
            {fmtDay(a.start)} เวลา {fmtTime(a.start)} น.
          </div>
          <div className="t-h3 clamp-2">{a.title}</div>
          <div className="row gap-6 t-meta">
            <MapPinIcon size={16} style={{ flex: 'none' }} />
            <span className="clamp-1">{a.place}</span>
          </div>
          <div className="row gap-8 mt-8">
            <span className="chip">+{fmtHours(a.hours)} ชม.</span>
            {credited ? (
              <span className="chip success">ได้รับชั่วโมงแล้ว</span>
            ) : registered ? (
              <span className="chip ink">ลงทะเบียนแล้ว</span>
            ) : a.opensAt && Date.now() < a.opensAt ? (
              <span className="chip accent">
                เปิดรับ {fmtDay(a.opensAt)} {fmtTime(a.opensAt)} น.
              </span>
            ) : full ? (
              <span className="chip">เต็มแล้ว</span>
            ) : (
              <span className="chip accent">เหลือ {seatsLeft} ที่</span>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

/* ───────── image lightbox ───────── */

export function Lightbox({ src, onClose }: { src: string | null; onClose: () => void }) {
  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          className="lightbox"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.img
            src={src}
            alt=""
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.96 }}
            transition={{ duration: 0.32, ease: EASE_OUT }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, i) => {
              if (Math.abs(i.offset.y) > 90 || Math.abs(i.velocity.y) > 500) onClose()
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

export function Empty({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="empty stack gap-8" style={{ alignItems: 'center' }}>
      <div className="fact-ic" style={{ width: 56, height: 56 }}>
        {icon}
      </div>
      <div className="t-h3 mt-8">{title}</div>
      {body && <p className="t-meta" style={{ maxWidth: 280 }}>{body}</p>}
      {action && <div className="mt-12">{action}</div>}
    </div>
  )
}
