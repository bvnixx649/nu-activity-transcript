import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { ArrowCounterClockwiseIcon, BellIcon, CaretRightIcon, ShieldCheckIcon, SignOutIcon } from '@phosphor-icons/react'
import { useStore } from '../../store'
import type { Category } from '../../data/types'
import { Avatar, CountUp, EASE_OUT, Page, Sheet } from '../../ui/kit'
import { CAT_LABEL, fmtDate, fmtHours } from '../../lib/format'
import { semesterEnd, semesterStart, strikesOf } from '../../lib/credit'
import { STRIKE_LIMIT } from '../../config'

export default function Me() {
  const navigate = useNavigate()
  const me = useStore((s) => s.me)
  const students = useStore((s) => s.students)
  const credits = useStore((s) => s.credits)
  const activities = useStore((s) => s.activities)
  const sup = useStore((s) => s.sup)
  const setMode = useStore((s) => s.setMode)
  const logout = useStore((s) => s.logout)
  const resetDemo = useStore((s) => s.resetDemo)
  const [confirm, setConfirm] = useState<null | 'logout' | 'reset'>(null)
  const registrations = useStore((s) => s.registrations)
  const lateCancels = useStore((s) => s.lateCancels)
  const waivers = useStore((s) => s.waivers)
  const student = me ? students[me] : undefined

  const { byCat, total } = useMemo(() => {
    const mine = credits.filter((c) => c.studentId === me).sort((a, b) => b.at - a.at)
    const byCat: Record<Category, typeof mine> = { volunteer: [], faculty: [] }
    mine.forEach((c) => byCat[c.category].push(c))
    return { byCat, total: mine.reduce((s, c) => s + c.hours, 0) }
  }, [credits, me])

  const sum = (c: Category) => byCat[c].reduce((s, x) => s + x.hours, 0)

  const strikes = useMemo(
    () => (me ? strikesOf({ activities, registrations, credits, lateCancels, waivers }, me) : []),
    [activities, registrations, credits, lateCancels, waivers, me],
  )
  const used = strikes.filter((x) => !x.waived).length
  const left = Math.max(0, STRIKE_LIMIT - used)
  const semStart = new Date(semesterStart())
  const semLabel = semStart.getMonth() === 4 ? 'ภาคการศึกษาที่ 1' : 'ภาคการศึกษาที่ 2'

  return (
    <Page tabbar memoryKey="me">
      <div className="pad safe-top">
        <div className="row gap-16" style={{ marginTop: 8 }}>
          <Avatar name={student?.name ?? '?'} size={64} />
          <div className="stack grow">
            <h1 className="t-title clamp-1" style={{ fontSize: 22 }}>
              {student?.name}
            </h1>
            <span className="t-meta num">{student?.id}</span>
            <span className="t-small clamp-1">คณะ{student?.faculty}</span>
          </div>
        </div>

        <section className="card mt-24" style={{ padding: 20 }}>
          <div className="row gap-12">
            <img src="./nu-emblem.png" width={44} height={44} alt="ตรามหาวิทยาลัยนเรศวร" style={{ flex: 'none' }} />
            <div className="stack grow">
              <h2 className="t-h3">NU Activity Transcript</h2>
              <span className="t-small">มหาวิทยาลัยนเรศวร ปีการศึกษา 2569</span>
            </div>
          </div>

          <div className="row gap-8 mt-20" style={{ alignItems: 'baseline' }}>
            <span className="num" style={{ fontSize: 48, fontWeight: 700, lineHeight: 1 }}>
              <CountUp value={total} decimals={Number.isInteger(total) ? 0 : 1} />
            </span>
            <span className="t-meta t-strong">ชั่วโมงจิตอาสา</span>
          </div>
          <span className="t-small">จาก {byCat.volunteer.length + byCat.faculty.length} กิจกรรม</span>
        </section>

        <section className="card mt-16" style={{ padding: 20 }}>
          <h2 className="t-h3">ประวัติเข้าร่วมกิจกรรม</h2>
          <div className="row gap-8 wrap mt-8">
            <span className="chip success">บันทึกลงระบบแล้ว</span>
            <span className="chip warn">รอศูนย์บันทึก</span>
            <span className="chip">รอผู้คุมส่งรายชื่อ</span>
          </div>
          {(['volunteer', 'faculty'] as Category[]).map((c) =>
            byCat[c].length ? (
              <div key={c} className="mt-12">
                <div className="stack list mt-4">
                  {byCat[c].map((cr, i) => {
                    const a = activities.find((x) => x.id === cr.activityId)
                    return (
                      <motion.div
                        key={cr.activityId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.1 + i * 0.04 }}
                      >
                        <Link to={`/ticket/${cr.activityId}`} className="row gap-12 press" style={{ padding: '14px 0' }}>
                          <div className="stack grow gap-4" style={{ minWidth: 0 }}>
                            <span className="clamp-2">{a?.title ?? cr.title}</span>
                            <span className="t-small">
                              {fmtDate(cr.at)} {cr.method === 'manual' ? 'ยืนยันโดยผู้คุม' : 'สแกน QR'}
                            </span>
                            <span>
                              {a?.recordedAt ? (
                                <span className="chip success">บันทึกลงระบบแล้ว</span>
                              ) : a?.submittedAt ? (
                                <span className="chip warn">รอศูนย์บันทึก</span>
                              ) : (
                                <span className="chip">รอผู้คุมส่งรายชื่อ</span>
                              )}
                            </span>
                          </div>
                          <span className="num t-strong" style={{ fontSize: 18 }}>
                            +{fmtHours(cr.hours)}
                          </span>
                          <CaretRightIcon size={16} className="t-faint" />
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            ) : null,
          )}
          {byCat.volunteer.length + byCat.faculty.length === 0 && <p className="t-meta mt-12">ยังไม่มีกิจกรรมที่ได้รับชั่วโมง</p>}
        </section>

        <section className="card mt-16" style={{ padding: 20 }}>
          <div className="row between gap-12">
            <div className="stack">
              <h2 className="t-h3">เครดิตการเข้าร่วม</h2>
              <span className="t-small">
                {semLabel} รีเซ็ต {fmtDate(semesterEnd())}
              </span>
            </div>
            <span className="num" style={{ fontSize: 30, fontWeight: 700, color: left <= 1 ? 'var(--accent-ink)' : undefined }}>
              {left}
              <span className="t-meta">/{STRIKE_LIMIT}</span>
            </span>
          </div>
          <div className="credit-pips mt-12" aria-hidden>
            {Array.from({ length: STRIKE_LIMIT }, (_, i) => (
              <i key={i} className={i < left ? 'on' : ''} />
            ))}
          </div>
          <p className="t-small mt-12">
            {left === 0
              ? 'เครดิตหมดแล้ว สมัครกิจกรรมใหม่ไม่ได้จนถึงภาคการศึกษาหน้า'
              : 'ยกเลิกหลังกำหนดหรือไม่มาจะถูกหัก 1 ครั้ง ถ้าหมดจะสมัครกิจกรรมไม่ได้จนจบภาค มีเหตุสุดวิสัยให้ติดต่อผู้คุมกิจกรรมนั้นเพื่อขอคืน'}
          </p>
          {strikes.length > 0 && (
            <div className="stack list mt-8">
              {strikes.map((x) => (
                <Link key={`${x.kind}-${x.a.id}`} to={`/a/${x.a.id}/dm`} className="row gap-12 press" style={{ padding: '12px 0' }}>
                  <div className="stack grow" style={{ minWidth: 0 }}>
                    <span className="clamp-1">{x.a.title}</span>
                    <span className="t-small">
                      {fmtDate(x.at)} {x.kind === 'late' ? 'ยกเลิกหลังกำหนด' : 'ลงทะเบียนแต่ไม่มา'}
                    </span>
                    {!x.waived && <span className="t-small t-accent t-strong">แตะเพื่อแจ้งเหตุผลกับผู้คุม</span>}
                  </div>
                  {x.waived ? <span className="chip success">คืนแล้ว</span> : <span className="chip danger">-1</span>}
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="card stack list mt-16" style={{ padding: '0 16px' }}>
          <MenuRow icon={<BellIcon size={20} />} label="การแจ้งเตือน" onClick={() => navigate('/settings/notify')} />
          <MenuRow
            icon={<ShieldCheckIcon size={20} />}
            label="โหมดผู้คุมกิจกรรม"
            hint={sup ? sup.org : 'ใช้รหัสจากกองกิจการนิสิต'}
            onClick={() => {
              if (sup) {
                setMode('supervisor')
                navigate('/sup')
              } else navigate('/sup/login')
            }}
          />
          <MenuRow icon={<ArrowCounterClockwiseIcon size={20} />} label="รีเซ็ตข้อมูลเดโม" onClick={() => setConfirm('reset')} />
          <MenuRow icon={<SignOutIcon size={20} />} label="ออกจากระบบ" danger onClick={() => setConfirm('logout')} />
        </div>
        <p className="t-small t-faint mt-16" style={{ textAlign: 'center' }}>
          เวอร์ชันสาธิต ข้อมูลทั้งหมดเก็บในเครื่องนี้
        </p>
      </div>

      <Sheet open={!!confirm} onClose={() => setConfirm(null)}>
        <div className="stack gap-16">
          <h2 className="t-title" style={{ fontSize: 22 }}>
            {confirm === 'logout' ? 'ออกจากระบบ?' : 'รีเซ็ตข้อมูลเดโม?'}
          </h2>
          <p className="t-meta">
            {confirm === 'logout'
              ? 'ชั่วโมงที่สะสมไว้ยังอยู่ เข้าสู่ระบบใหม่ได้ด้วยรหัสนิสิตและ PIN'
              : 'กิจกรรม ประกาศ แชท และรายชื่อจะกลับเป็นค่าเริ่มต้น บัญชีของคุณยังอยู่'}
          </p>
          <div className="stack gap-8 mt-8">
            <button
              className="btn btn-danger-soft btn-block"
              onClick={() => {
                if (confirm === 'logout') {
                  logout()
                  navigate('/welcome', { replace: true })
                } else {
                  resetDemo()
                  toast.success('รีเซ็ตข้อมูลเดโมแล้ว')
                }
                setConfirm(null)
              }}
            >
              {confirm === 'logout' ? 'ออกจากระบบ' : 'รีเซ็ต'}
            </button>
            <button className="btn btn-ghost btn-block" onClick={() => setConfirm(null)}>
              ยกเลิก
            </button>
          </div>
        </div>
      </Sheet>
    </Page>
  )
}

function MenuRow({ icon, label, hint, danger, onClick }: { icon: React.ReactNode; label: string; hint?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button className="row gap-12 press" style={{ padding: '14px 0', width: '100%', textAlign: 'left' }} onClick={onClick}>
      <span className={danger ? 't-danger' : ''} style={{ display: 'grid' }}>
        {icon}
      </span>
      <div className="stack grow">
        <span className={danger ? 't-danger' : ''}>{label}</span>
        {hint && <span className="t-small">{hint}</span>}
      </div>
      {!danger && <CaretRightIcon size={16} className="t-faint" />}
    </button>
  )
}
