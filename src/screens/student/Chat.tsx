import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { PaperPlaneRightIcon } from '@phosphor-icons/react'
import { useStore, regCount } from '../../store'
import { Avatar, EASE_OUT, TopBar } from '../../ui/kit'
import { fmtDay, fmtTime } from '../../lib/format'
import { haptic } from '../../lib/device'

export default function ChatScreen({ role }: { role: 'student' | 'sup' }) {
  const { id = '' } = useParams()
  const a = useStore((s) => s.activities.find((x) => x.id === id))
  const chats = useStore((s) => s.chats)
  const me = useStore((s) => s.me)
  const registrations = useStore((s) => s.registrations)
  const extraReg = useStore((s) => s.extraReg)
  const send = useStore((s) => s.sendChat)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const firstPaint = useRef(true)

  const msgs = useMemo(() => chats.filter((c) => c.activityId === id).sort((x, y) => x.at - y.at), [chats, id])

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: firstPaint.current ? 'auto' : 'smooth' })
    firstPaint.current = false
  }, [msgs.length])

  const submit = () => {
    const t = text.trim()
    if (!t) return
    haptic.tap()
    send(id, t, role === 'sup')
    setText('')
  }

  const mine = (m: (typeof msgs)[number]) => (role === 'sup' ? !!m.sup : m.authorId === me)

  return (
    <div className="chat-wrap">
      <TopBar
        alwaysTitle
        fallback={role === 'sup' ? `/sup/a/${id}` : `/a/${id}`}
        title={
          <div className="stack" style={{ lineHeight: 1.3 }}>
            <span className="clamp-1">{a?.title ?? 'ห้องแชท'}</span>
            <span className="t-small" style={{ fontWeight: 500 }}>
              ผู้เข้าร่วม {regCount({ registrations, extraReg }, id)} คน
            </span>
          </div>
        }
      />
      <div className="chat-scroll" ref={listRef}>
        {msgs.length === 0 && (
          <p className="t-meta" style={{ textAlign: 'center', marginTop: 40 }}>
            เริ่มทักทายผู้เข้าร่วมกิจกรรมได้เลย
          </p>
        )}
        {msgs.map((m, i) => {
          const prev = msgs[i - 1]
          const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString()
          const showName = !mine(m) && (newDay || prev.authorId !== m.authorId)
          return (
            <div key={m.id}>
              {newDay && (
                <div className="t-small t-faint" style={{ textAlign: 'center', margin: '18px 0 6px' }}>
                  {fmtDay(m.at)}
                </div>
              )}
              {showName && (
                <div className="t-small" style={{ margin: '12px 0 -4px 44px' }}>
                  {m.authorName}
                  {m.sup && <span className="t-accent t-strong"> ผู้คุม</span>}
                </div>
              )}
              <motion.div
                className={`bubble-row ${mine(m) ? 'mine' : ''}`}
                initial={i >= msgs.length - 1 && !firstPaint.current ? { opacity: 0, transform: 'translateY(8px) scale(0.98)' } : false}
                animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                {!mine(m) && (showName ? <Avatar name={m.authorName} size={32} sup={m.sup} /> : <span style={{ width: 32, flex: 'none' }} />)}
                <div className={`bubble ${m.sup && !mine(m) ? 'sup' : ''}`}>
                  {m.text}
                  <div className="t-small" style={{ fontSize: 11, opacity: 0.6, marginTop: 2, textAlign: 'right', color: 'inherit' }}>
                    {fmtTime(m.at)}
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>
      <div className="composer">
        <textarea
          rows={1}
          value={text}
          placeholder="พิมพ์ข้อความ"
          enterKeyHint="send"
          onChange={(e) => {
            setText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = `${Math.min(120, e.target.scrollHeight)}px`
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <button className="icon-btn" style={{ width: 44, height: 44, background: 'var(--accent)', color: '#fff' }} onClick={submit} aria-label="ส่ง">
          <PaperPlaneRightIcon size={20} weight="fill" />
        </button>
      </div>
    </div>
  )
}
