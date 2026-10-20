import { useMemo } from 'react'
import type { Activity, Credit, Registration } from '../data/types'
import { fmtHours } from '../lib/format'
import { yearMonths, yearStart } from '../lib/stage'
import { CountUp } from './kit'

const MON = new Intl.DateTimeFormat('th-TH', { month: 'short' })
const YEAR = new Intl.DateTimeFormat('th-TH', { year: 'numeric' })

/** Activity-year stats: four numbers, an optional KPI bar, and hours issued per month. */
export function YearStats({
  activities,
  credits,
  registrations,
  now,
  kpi,
}: {
  activities: Activity[]
  credits: Credit[]
  registrations: Registration[]
  now: number
  kpi?: number
}) {
  const d = useMemo(() => {
    const y0 = yearStart(now)
    const held = activities.filter((a) => a.start >= y0 && a.start <= now)
    const ids = new Set(held.map((a) => a.id))
    const cr = credits.filter((c) => ids.has(c.activityId))
    const ended = new Set(held.filter((a) => a.end < now).map((a) => a.id))
    const regEnded = registrations.filter((r) => ended.has(r.activityId)).length
    const crEnded = cr.filter((c) => ended.has(c.activityId)).length
    const months = yearMonths(now).map(([s, e]) => ({
      s,
      hours: cr.filter((c) => {
        const a = held.find((x) => x.id === c.activityId)!
        return a.start >= s && a.start < e
      }).reduce((t, c) => t + c.hours, 0),
      future: s > now,
      current: now >= s && now < e,
    }))
    return {
      y0,
      count: held.length,
      people: cr.length,
      hours: cr.reduce((t, c) => t + c.hours, 0),
      rate: regEnded ? Math.round((crEnded / regEnded) * 100) : 0,
      months,
      max: Math.max(1, ...months.map((m) => m.hours)),
    }
  }, [activities, credits, registrations, now])

  // Activity year is labelled by the Buddhist year it starts in, e.g. ปีกิจกรรม 2569
  const yearLabel = YEAR.format(d.y0).replace(/\D/g, '')

  return (
    <div className="stack gap-12">
      <div className="t-meta">
        ปีกิจกรรม {yearLabel} ตั้งแต่ 1 พ.ค. ถึง 31 มี.ค.
      </div>
      <div className="stat-grid">
        <Tile label="กิจกรรมที่จัด" value={d.count} />
        <Tile label="ผู้เข้าร่วม" value={d.people} unit="คน" />
        <Tile label="ชั่วโมงที่ออกให้" value={d.hours} unit="ชม." />
        <Tile label="มาจริงเทียบกับที่ลงทะเบียน" value={d.rate} unit="%" />
      </div>

      {kpi != null && (
        <div className="card" style={{ padding: 16 }}>
          <div className="row between">
            <span className="t-strong">เป้าหมาย {kpi} กิจกรรม</span>
            <span className="num t-strong">
              {d.count}/{kpi}
            </span>
          </div>
          <div className="meter mt-8">
            <i style={{ width: `${Math.min(100, (d.count / kpi) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 16 }}>
        <span className="t-strong">ชั่วโมงที่ออกให้รายเดือน</span>
        <div className="bars mt-16" role="img" aria-label="กราฟชั่วโมงที่ออกให้รายเดือน">
          {d.months.map((m) => (
            <div key={m.s} className={`bar ${m.current ? 'current' : ''} ${m.future ? 'future' : ''}`}>
              <span className="bar-val num">{m.hours > 0 ? fmtHours(m.hours) : ''}</span>
              <span className="bar-track">
                <i style={{ height: `${(m.hours / d.max) * 100}%` }} />
              </span>
              <span className="bar-label">{MON.format(m.s)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tile({ label, value, unit }: { label: string; value: number; unit?: string }) {
  return (
    <div className="card stack" style={{ padding: '14px 16px' }}>
      <span className="num" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>
        <CountUp value={value} />
        {unit && <span className="t-meta"> {unit}</span>}
      </span>
      <span className="t-small">{label}</span>
    </div>
  )
}
