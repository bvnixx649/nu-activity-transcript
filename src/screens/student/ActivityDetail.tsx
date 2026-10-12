import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion, useScroll, useTransform } from 'motion/react'
import { toast } from 'sonner'
import {
  CalendarBlankIcon,
  CaretRightIcon,
  ChatCircleDotsIcon,
  CheckIcon,
  HourglassMediumIcon,
  LinkSimpleIcon,
  LockSimpleIcon,
  MapPinIcon,
  PhoneIcon,
  QrCodeIcon,
  ShareNetworkIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react'
import { useStore, regCount, isRegistered, myCredit } from '../../store'
import type { Activity } from '../../data/types'
import { Avatar, BackButton, EASE_OUT, Empty, Lightbox, Page, Sheet, useScrollEl, useScrollY } from '../../ui/kit'
import { CAT_LABEL, fmtDateLong, fmtDay, fmtHours, fmtRange, fmtTime, phase, relDay, timeAgo } from '../../lib/format'
import { useNow } from '../../lib/hooks'
import { haptic } from '../../lib/device'

export default function ActivityDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const a = useStore((s) => s.activities.find((x) => x.id === id))
  const registrations = useStore((s) => s.registrations)
  const extraReg = useStore((s) => s.extraReg)
  const credits = useStore((s) => s.credits)
  const me = useStore((s) => s.me)
  const students = useStore((s) => s.students)
  const register = useStore((s) => s.register)
  const cancel = useStore((s) => s.cancel)
  const [sheet, setSheet] = useState<null | 'register' | 'cancel'>(null)
  const [done, setDone] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const now = useNow()

  if (!a) {
    return (
      <Page>
        <div className="safe-top pad">
          <BackButton />
          <Empty icon={<CalendarBlankIcon size={26} />} title="ไม่พบกิจกรรมนี้" body="กิจกรรมอาจถูกลบหรือยังไม่ได้เผยแพร่" />
        </div>
      </Page>
    )
  }

  const count = regCount({ registrations, extraReg }, a.id)
  const seatsLeft = Math.max(0, a.capacity - count)
  const registered = isRegistered({ registrations, me }, a.id)
  const credit = myCredit({ credits, me }, a.id)
  const ph = phase(a, now)
  const student = me ? students[me] : undefined

  const confirmRegister = () => {
    register(a.id)
    haptic.success()
    setDone(true)
    setTimeout(() => {
      setSheet(null)
      toast.success('ลงทะเบียนแล้ว', { description: 'เราจะแจ้งเตือนก่อนกิจกรรมเริ่ม 1 วัน' })
    }, 750)
    setTimeout(() => setDone(false), 1200)
  }

  return (
    <>
      <Page>
        <DetailBody a={a} count={count} registered={registered} onImage={setLightbox} />
      </Page>

      <div className="bottom-cta">
        <div className="stack grow">
          {credit ? (
            <>
              <span className="t-h3 t-success">ได้รับ {fmtHours(credit.hours)} ชม. แล้ว</span>
              <span className="t-small">{CAT_LABEL[credit.category]}</span>
            </>
          ) : (
            <>
              <span className="num" style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2 }}>
                +{fmtHours(a.hours)} ชม.
              </span>
              <span className="t-small">
                {registered && ph === 'upcoming'
                  ? `ลงทะเบียนแล้ว ${relDay(a.start, now)}`
                  : ph === 'ended'
                    ? 'กิจกรรมจบแล้ว'
                    : seatsLeft > 0
                      ? `เหลือ ${seatsLeft} ที่`
                      : 'ที่นั่งเต็มแล้ว'}
              </span>
            </>
          )}
        </div>
        {credit ? (
          <button className="btn btn-soft" onClick={() => navigate(`/ticket/${a.id}`)}>
            ดูบัตรยืนยัน
          </button>
        ) : ph === 'ended' ? (
          <button className="btn btn-soft" disabled>
            จบแล้ว
          </button>
        ) : registered && ph === 'live' ? (
          <button className="btn btn-accent" onClick={() => navigate('/scan')}>
            <QrCodeIcon size={20} weight="bold" />
            สแกนรับชั่วโมง
          </button>
        ) : registered ? (
          <button className="btn btn-soft" onClick={() => setSheet('cancel')}>
            <CheckIcon size={18} weight="bold" />
            ลงทะเบียนแล้ว
          </button>
        ) : seatsLeft <= 0 ? (
          <button className="btn btn-soft" disabled>
            เต็มแล้ว
          </button>
        ) : (
          <button className="btn btn-ink" onClick={() => setSheet('register')}>
            ลงทะเบียน
          </button>
        )}
      </div>

      <Sheet open={sheet === 'register'} onClose={() => setSheet(null)}>
        <div className="stack gap-20">
          <div className="row gap-12">
            <img src={a.poster} alt="" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', flex: 'none' }} />
            <div className="stack grow">
              <span className="t-h3 clamp-2">{a.title}</span>
              <span className="t-small">
                {fmtDay(a.start)} {fmtRange(a.start, a.end)}
              </span>
            </div>
          </div>
          <hr className="hairline" />
          <div className="row between">
            <div className="stack">
              <span className="t-small">ลงทะเบียนในชื่อ</span>
              <span className="t-strong">{student?.name}</span>
            </div>
            <span className="num t-meta">{student?.id}</span>
          </div>
          <p className="t-meta">
            เมื่อจบกิจกรรม สแกน QR จากผู้คุมเพื่อรับ {fmtHours(a.hours)} ชั่วโมง{CAT_LABEL[a.category]} ยกเลิกได้จนถึงก่อนกิจกรรมเริ่ม
          </p>
          <button
            className={`btn btn-block ${done ? 'btn-accent' : 'btn-ink'}`}
            onClick={confirmRegister}
            disabled={done}
            style={done ? { opacity: 1, background: 'var(--success)' } : undefined}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {done ? (
                <motion.span
                  key="ok"
                  className="row gap-8"
                  initial={{ opacity: 0, transform: 'scale(0.8)', filter: 'blur(4px)' }}
                  animate={{ opacity: 1, transform: 'scale(1)', filter: 'blur(0px)' }}
                  transition={{ type: 'spring', duration: 0.4, bounce: 0.3 }}
                >
                  <CheckIcon size={20} weight="bold" /> ลงทะเบียนแล้ว
                </motion.span>
              ) : (
                <motion.span key="go" exit={{ opacity: 0, transform: 'scale(0.9)', filter: 'blur(4px)' }} transition={{ duration: 0.15 }}>
                  ยืนยันลงทะเบียน
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </Sheet>

      <Sheet open={sheet === 'cancel'} onClose={() => setSheet(null)}>
        <div className="stack gap-16">
          <h2 className="t-title" style={{ fontSize: 22 }}>
            ยกเลิกการลงทะเบียน?
          </h2>
          <p className="t-meta">ที่นั่งของคุณจะเปิดให้คนอื่นลงทะเบียนแทนทันที ถ้าเปลี่ยนใจก็ลงทะเบียนใหม่ได้ถ้ายังมีที่ว่าง</p>
          <div className="stack gap-8 mt-8">
            <button
              className="btn btn-danger-soft btn-block"
              onClick={() => {
                cancel(a.id)
                setSheet(null)
                toast('ยกเลิกการลงทะเบียนแล้ว')
              }}
            >
              ยกเลิกการลงทะเบียน
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setSheet(null)}>
              ไม่ยกเลิก
            </button>
          </div>
        </div>
      </Sheet>

      <Lightbox src={lightbox} onClose={() => setLightbox(null)} />
    </>
  )
}

function DetailBody({
  a,
  count,
  registered,
  onImage,
}: {
  a: Activity
  count: number
  registered: boolean
  onImage: (src: string) => void
}) {
  const navigate = useNavigate()
  const scrollRef = useScrollEl()
  const { scrollY } = useScroll({ container: scrollRef ?? undefined })
  const scale = useTransform(scrollY, [-240, 0], [1.6, 1], { clamp: true })
  const y = useTransform(scrollY, [0, 420], [0, 140])
  const solid = useScrollY(300)
  const chats = useStore((s) => s.chats)
  const now = Date.now()
  const ph = phase(a, now)

  const { lastMsg, msgCount } = useMemo(() => {
    const list = chats.filter((c) => c.activityId === a.id)
    return { lastMsg: list[list.length - 1], msgCount: list.length }
  }, [chats, a.id])

  const share = async () => {
    const url = `${location.origin}${location.pathname}#/a/${a.id}`
    try {
      if (navigator.share) await navigator.share({ title: a.title, url })
      else {
        await navigator.clipboard.writeText(url)
        toast('คัดลอกลิงก์แล้ว')
      }
    } catch {
      /* user closed share sheet */
    }
  }

  const multiDay = new Date(a.start).toDateString() !== new Date(a.end).toDateString()
  const fill = Math.min(1, count / a.capacity)

  return (
    <>
      <header className="topbar" data-solid={solid} style={{ marginBottom: 'calc(-56px - var(--safe-top))' }}>
        <div>
          <BackButton glass={!solid} />
        </div>
        <div className="topbar-title">{a.title}</div>
        <div className="topbar-end">
          <button className={`icon-btn ${solid ? 'plain' : 'glass'}`} onClick={share} aria-label="แชร์">
            <ShareNetworkIcon size={20} weight="bold" />
          </button>
        </div>
      </header>

      <div className="hero">
        <motion.img src={a.poster} alt="" style={{ scale, y }} />
        <div className="hero-shade" />
      </div>

      <div className="detail-body">
        <motion.div
          initial={{ opacity: 0, transform: 'translateY(12px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.12 }}
        >
          <div className="row gap-8 wrap">
            <span className={`chip ${a.category === 'volunteer' ? 'accent' : ''}`}>{CAT_LABEL[a.category]}</span>
            {ph === 'live' && (
              <span className="chip ink">
                <span className="dot-live" /> กำลังดำเนินอยู่
              </span>
            )}
          </div>
          <h1 className="t-title mt-12">{a.title}</h1>
          <div className="row gap-10 mt-12">
            <Avatar name={a.org} size={28} />
            <span className="t-meta">{a.org}</span>
          </div>
        </motion.div>

        <div className="stack list mt-16">
          <div className="fact">
            <div className="fact-ic">
              <CalendarBlankIcon size={20} />
            </div>
            <div className="stack">
              <span className="t-strong">{fmtDateLong(a.start)}</span>
              <span className="t-meta">
                {multiDay ? `${fmtTime(a.start)} น. ถึง ${fmtDay(a.end)} ${fmtTime(a.end)} น.` : fmtRange(a.start, a.end)}
              </span>
            </div>
          </div>
          <div className="fact">
            <div className="fact-ic">
              <MapPinIcon size={20} />
            </div>
            <div className="stack grow">
              <span className="t-strong">{a.place}</span>
              {a.lat != null && a.lng != null && (
                <a
                  className="t-meta t-accent t-strong"
                  href={`https://www.google.com/maps/search/?api=1&query=${a.lat},${a.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  เปิดใน Google Maps
                </a>
              )}
            </div>
          </div>
          <div className="fact">
            <div className="fact-ic">
              <HourglassMediumIcon size={20} />
            </div>
            <div className="stack">
              <span className="t-strong">ได้รับ {fmtHours(a.hours)} ชั่วโมง</span>
              <span className="t-meta">นับเป็นชั่วโมง{CAT_LABEL[a.category]}</span>
            </div>
          </div>
          <div className="fact">
            <div className="fact-ic">
              <UsersThreeIcon size={20} />
            </div>
            <div className="stack grow gap-8">
              <span className="t-strong">
                ลงทะเบียนแล้ว <span className="num">{count}</span> จาก <span className="num">{a.capacity}</span> คน
              </span>
              <div className="capbar">
                <motion.i
                  initial={{ transform: 'scaleX(0)' }}
                  animate={{ transform: `scaleX(${fill})` }}
                  transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.25 }}
                  style={{ width: '100%', background: fill >= 1 ? 'var(--grey)' : undefined }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="card row gap-12 mt-16" style={{ padding: 16 }}>
          <Avatar name={a.supervisor.name} size={44} sup />
          <div className="stack grow">
            <span className="t-strong clamp-1">{a.supervisor.name}</span>
            <span className="t-small">ผู้คุมกิจกรรม โทร {a.supervisor.phone}</span>
          </div>
          <a className="icon-btn" href={`tel:${a.supervisor.phone.replace(/\D/g, '')}`} aria-label="โทรหาผู้คุมกิจกรรม">
            <PhoneIcon size={20} weight="fill" />
          </a>
        </div>

        <h2 className="t-h3 mt-32">รายละเอียด</h2>
        <p className="t-body prewrap mt-8 t-muted">{a.description}</p>

        {(a.chatEnabled || a.openChatUrl) && (
          <>
            <h2 className="t-h3 mt-32">พูดคุยกับผู้เข้าร่วม</h2>
            <div className="card stack list mt-12" style={{ padding: '0 16px' }}>
              {a.chatEnabled && (
                <button
                  className="row gap-12 press"
                  style={{ padding: '14px 0', textAlign: 'left' }}
                  onClick={() => (registered ? navigate(`/a/${a.id}/chat`) : toast('ลงทะเบียนก่อนเพื่อเข้าห้องแชท'))}
                >
                  <div className="fact-ic" style={{ boxShadow: 'none', background: 'var(--accent-soft)', color: 'var(--accent-ink)' }}>
                    {registered ? <ChatCircleDotsIcon size={20} weight="fill" /> : <LockSimpleIcon size={20} weight="fill" />}
                  </div>
                  <div className="stack grow">
                    <span className="t-strong">ห้องแชทกิจกรรม</span>
                    <span className="t-small clamp-1">
                      {!registered ? 'สำหรับคนที่ลงทะเบียนแล้ว' : lastMsg ? `${lastMsg.authorName.split(' ')[0]}: ${lastMsg.text}` : 'ยังไม่มีข้อความ'}
                    </span>
                  </div>
                  {registered && msgCount > 0 && <span className="t-small num">{msgCount}</span>}
                  <CaretRightIcon size={18} className="t-faint" />
                </button>
              )}
              {a.openChatUrl && (
                <a className="row gap-12 press" style={{ padding: '14px 0' }} href={a.openChatUrl} target="_blank" rel="noreferrer">
                  <div className="fact-ic" style={{ boxShadow: 'none', background: '#06c755', color: '#fff' }}>
                    <LinkSimpleIcon size={20} weight="bold" />
                  </div>
                  <div className="stack grow">
                    <span className="t-strong">LINE OpenChat</span>
                    <span className="t-small">สำหรับคนที่สะดวกคุยใน LINE</span>
                  </div>
                  <CaretRightIcon size={18} className="t-faint" />
                </a>
              )}
            </div>
          </>
        )}

        <h2 className="t-h3 mt-32">
          ประกาศจากผู้คุม {a.announcements.length > 0 && <span className="t-faint num">{a.announcements.length}</span>}
        </h2>
        <div className="stack list">
          {a.announcements.length === 0 && <p className="t-meta mt-8">ยังไม่มีประกาศ ถ้ามีการเปลี่ยนแปลงจะแจ้งที่นี่และส่งแจ้งเตือนถึงคุณ</p>}
          {a.announcements.map((n) => (
            <div key={n.id} className="announce">
              <Avatar name={a.supervisor.name} size={36} sup />
              <div className="stack grow">
                <div className="row gap-8">
                  <span className="t-strong clamp-1">{a.supervisor.name}</span>
                  <span className="t-small t-faint" style={{ flex: 'none' }}>
                    {timeAgo(n.at)}
                  </span>
                </div>
                <p className="t-body prewrap mt-4">{n.text}</p>
                {n.images.length > 0 && (
                  <div className={`announce-imgs ${n.images.length === 1 ? 'one' : ''}`}>
                    {n.images.map((src) => (
                      <button key={src.slice(-40)} onClick={() => onImage(src)} className="press">
                        <img src={src} alt="" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div style={{ height: 'calc(120px + var(--safe-bottom))' }} />
      </div>
    </>
  )
}
