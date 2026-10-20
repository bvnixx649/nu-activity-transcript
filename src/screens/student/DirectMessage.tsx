import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { PaperPlaneRightIcon } from '@phosphor-icons/react'
import { useStore } from '../../store'
import { EASE_OUT, TopBar } from '../../ui/kit'
import { fmtDay, fmtTime } from '../../lib/format'
import { haptic } from '../../lib/device'

const QUICK = [
  { label: 'ไม่สบาย', text: 'ขอแจ้งว่าไม่สามารถมาร่วมกิจกรรมได้ เนื่องจากไม่สบาย ' },
  { label: 'ติดเรียนหรือสอบ', text: 'ขอแจ้งว่าไม่สามารถมาร่วมกิจกรรมได้ เนื่องจากติดเรียนหรือสอบ ' },
  { label: 'เหตุฉุกเฉินทางบ้าน', text: 'ขอแจ้งว่าไม่สามารถมาร่วมกิจกรรมได้ เนื่องจากมีเหตุฉุกเฉินทางบ้าน ' },
  { label: 'ถามรายละเอียด', text: 'สอบถามรายละเอียดกิจกรรมครับ/ค่ะ ' },
]

/** One private thread between a student and the supervisors of an activity. */
export default function DirectMessage({ role }: { role: 'student' | 'sup' }) {
  const { id = '', sid } = useParams()
  const me = useStore((s) => s.me)
  const studentId = role === 'sup' ? sid ?? '' : me ?? ''
  const a = useStore((s) => s.activities.find((x) => x.id === id))
  const student = useStore((s) => s.students[studentId])
  const dms = useStore((s) => s.dms)
  const send = useStore((s) => s.sendDm)
  const readDm = useStore((s) => s.readDm)
  const [text, setText] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const firstPaint = useRef(true)

  const msgs = useMemo(
    () => dms.filter((m) => m.activityId === id && m.studentId === studentId).sort((x, y) => x.at - y.at),
    [dms, id, studentId],
  )
  const unread = msgs.some((m) => !m.read && m.fromSup !== (role === 'sup'))
  useEffect(() => {
    if (unread) readDm(id, studentId, role === 'sup')
  }, [unread, readDm, id, studentId, role])

  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: firstPaint.current ? 'auto' : 'smooth' })
    firstPaint.current = false
  }, [msgs.length])

  const submit = () => {
    const t = text.trim()
    if (!t || !studentId) return
    haptic.tap()
    send(id, studentId, t, role === 'sup')
    setText('')
    if (inputRef.current) inputRef.current.style.height = 'auto'
  }

  const mine = (fromSup: boolean) => fromSup === (role === 'sup')

  return (
    <div className="chat-wrap">
      <TopBar
        alwaysTitle
        fallback={role === 'sup' ? `/sup/a/${id}` : `/a/${id}`}
        title={
          <div className="stack" style={{ lineHeight: 1.3 }}>
            <span className="clamp-1">{role === 'sup' ? student?.name ?? studentId : `ผู้คุม ${a?.supervisor.name ?? ''}`}</span>
            <span className="t-small clamp-1" style={{ fontWeight: 500 }}>
              {a?.title}
            </span>
          </div>
        }
      />
      <div className="chat-scroll" ref={listRef}>
        <p className="t-small t-faint" style={{ textAlign: 'center', margin: '16px 24px 0' }}>
          {role === 'sup'
            ? `ข้อความส่วนตัวกับ ${student?.name ?? 'นิสิต'} คนอื่นไม่เห็น`
            : 'ข้อความส่วนตัวถึงผู้คุมกิจกรรมนี้ ผู้เข้าร่วมคนอื่นไม่เห็น ใช้แจ้งเหตุผลที่มาไม่ได้หรือถามรายละเอียด'}
        </p>
        {msgs.map((m, i) => {
          const prev = msgs[i - 1]
          const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString()
          return (
            <div key={m.id}>
              {newDay && (
                <div className="t-small t-faint" style={{ textAlign: 'center', margin: '18px 0 6px' }}>
                  {fmtDay(m.at)}
                </div>
              )}
              <motion.div
                className={`bubble-row ${mine(m.fromSup) ? 'mine' : ''}`}
                initial={i >= msgs.length - 1 && !firstPaint.current ? { opacity: 0, transform: 'translateY(8px) scale(0.98)' } : false}
                animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                transition={{ duration: 0.3, ease: EASE_OUT }}
              >
                <div className={`bubble ${m.fromSup && !mine(m.fromSup) ? 'sup' : ''}`}>
                  {m.text}
                  <div className="t-small" style={{ fontSize: 11, opacity: 0.6, marginTop: 2, textAlign: 'right', color: 'inherit' }}>
                    {fmtTime(m.at)}
                    {mine(m.fromSup) && m.read && ' อ่านแล้ว'}
                  </div>
                </div>
              </motion.div>
            </div>
          )
        })}
      </div>
      {role === 'student' && (
        <div className="row gap-8 quick-replies">
          {QUICK.map((q) => (
            <button
              key={q.label}
              className="chip press"
              onClick={() => {
                setText(q.text)
                inputRef.current?.focus()
              }}
            >
              {q.label}
            </button>
          ))}
        </div>
      )}
      <div className="composer">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          placeholder={role === 'sup' ? 'ตอบกลับนิสิต' : 'พิมพ์ข้อความถึงผู้คุม'}
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
