import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import {
  BellRingingIcon,
  BellSimpleIcon,
  CalendarCheckIcon,
  ChatCircleIcon,
  GearSixIcon,
  MegaphoneIcon,
  SealCheckIcon,
  SparkleIcon,
} from '@phosphor-icons/react'
import { useStore } from '../../store'
import type { NoticeKind } from '../../data/types'
import { EASE_OUT, Empty, Page } from '../../ui/kit'
import { timeAgo } from '../../lib/format'
import { askNotifyPermission } from '../../lib/device'

const ICON: Record<NoticeKind, React.ReactNode> = {
  new: <SparkleIcon size={20} weight="fill" />,
  announce: <MegaphoneIcon size={20} weight="fill" />,
  chat: <ChatCircleIcon size={20} weight="fill" />,
  credit: <SealCheckIcon size={20} weight="fill" />,
  reminder: <CalendarCheckIcon size={20} weight="fill" />,
  registered: <CalendarCheckIcon size={20} weight="fill" />,
}

export async function enablePush(setSettings: (p: { enabled: boolean }) => void) {
  const r = await askNotifyPermission()
  if (r === 'granted') {
    setSettings({ enabled: true })
    toast.success('เปิดการแจ้งเตือนแล้ว')
  } else if (r === 'unsupported') {
    setSettings({ enabled: true })
    toast('เบราว์เซอร์นี้ยังไม่รองรับแจ้งเตือนบนหน้าจอ จะแจ้งในแอพแทน', { description: 'บน iPhone ให้เพิ่มแอพไปที่หน้าจอโฮมก่อน' })
  } else {
    toast.error('ยังไม่ได้อนุญาตการแจ้งเตือน', { description: 'เปิดได้ในการตั้งค่าของเบราว์เซอร์' })
  }
}

export default function Inbox() {
  const navigate = useNavigate()
  const notices = useStore((s) => s.notices)
  const settings = useStore((s) => s.settings)
  const setSettings = useStore((s) => s.setSettings)
  const markAllRead = useStore((s) => s.markAllRead)

  useEffect(() => () => markAllRead(), [markAllRead])

  const groups = useMemo(() => {
    const today = new Date().toDateString()
    const t = notices.filter((n) => new Date(n.at).toDateString() === today)
    const e = notices.filter((n) => new Date(n.at).toDateString() !== today)
    return [
      { label: 'วันนี้', items: t },
      { label: 'ก่อนหน้านี้', items: e },
    ].filter((g) => g.items.length)
  }, [notices])

  return (
    <Page tabbar memoryKey="inbox">
      <div className="pad safe-top">
        <div className="row between" style={{ minHeight: 48 }}>
          <h1 className="t-title">แจ้งเตือน</h1>
          <Link to="/settings/notify" className="icon-btn" aria-label="ตั้งค่าการแจ้งเตือน">
            <GearSixIcon size={20} />
          </Link>
        </div>

        {!settings.enabled && (
          <motion.div
            className="card row gap-12 mt-16"
            style={{ padding: 16 }}
            initial={{ opacity: 0, transform: 'translateY(8px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: 0.4, ease: EASE_OUT }}
          >
            <div className="fact-ic" style={{ background: 'var(--accent-soft)', color: 'var(--accent-ink)', boxShadow: 'none' }}>
              <BellRingingIcon size={20} weight="fill" />
            </div>
            <div className="stack grow">
              <span className="t-strong">ไม่พลาดกิจกรรมใหม่</span>
              <span className="t-small">เปิดแจ้งเตือนเพื่อรู้ทันทีเมื่อมีกิจกรรมใหม่หรือผู้คุมประกาศเปลี่ยนแปลง</span>
            </div>
            <button className="btn btn-ink btn-xs" onClick={() => enablePush(setSettings)}>
              เปิด
            </button>
          </motion.div>
        )}

        {notices.length === 0 && <Empty icon={<BellSimpleIcon size={26} />} title="ยังไม่มีการแจ้งเตือน" />}

        {groups.map((g) => (
          <section key={g.label} className="mt-24">
            <h2 className="t-small t-strong">{g.label}</h2>
            <div className="stack list mt-4">
              {g.items.map((n) => (
                <button
                  key={n.id}
                  className="row gap-12 press"
                  style={{ padding: '14px 0', alignItems: 'flex-start', textAlign: 'left', width: '100%' }}
                  onClick={() => n.activityId && navigate(`/a/${n.activityId}`)}
                >
                  <div
                    className="fact-ic"
                    style={{
                      boxShadow: 'none',
                      background: n.kind === 'credit' ? 'var(--success-soft)' : n.kind === 'new' ? 'var(--accent-soft)' : 'var(--fill)',
                      color: n.kind === 'credit' ? 'var(--success)' : n.kind === 'new' ? 'var(--accent-ink)' : 'var(--text)',
                    }}
                  >
                    {ICON[n.kind]}
                  </div>
                  <div className="stack grow">
                    <div className="row gap-8 between">
                      <span className={`clamp-1 ${n.read ? '' : 't-strong'}`}>{n.title}</span>
                      <span className="t-small t-faint" style={{ flex: 'none' }}>
                        {timeAgo(n.at)}
                      </span>
                    </div>
                    <span className="t-meta clamp-2">{n.body}</span>
                  </div>
                  {!n.read && <i style={{ width: 8, height: 8, borderRadius: 9, background: 'var(--accent)', marginTop: 8, flex: 'none' }} aria-label="ยังไม่ได้อ่าน" />}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Page>
  )
}
