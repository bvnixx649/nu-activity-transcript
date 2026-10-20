import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import type { Activity } from '../data/types'

const MONTH = new Intl.DateTimeFormat('th-TH', { month: 'long', year: 'numeric' })
const WEEK = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

/** Month grid with a dot under every day that has an activity. `month` is any time inside the month shown. */
export function MonthCalendar({
  activities,
  month,
  onMonth,
  selected,
  onSelect,
  now,
}: {
  activities: Activity[]
  month: number
  onMonth: (t: number) => void
  selected: string | null
  onSelect: (key: string | null) => void
  now: number
}) {
  const m = new Date(month)
  const first = new Date(m.getFullYear(), m.getMonth(), 1)
  const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
  const count = new Map<string, number>()
  activities.forEach((a) => count.set(dayKey(a.start), (count.get(dayKey(a.start)) ?? 0) + 1))
  const today = dayKey(now)
  const cells: (number | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const shift = (n: number) => {
    onSelect(null)
    onMonth(new Date(m.getFullYear(), m.getMonth() + n, 1).getTime())
  }

  return (
    <div className="card cal">
      <div className="row between">
        <button className="icon-btn" onClick={() => shift(-1)} aria-label="เดือนก่อน">
          <CaretLeftIcon size={18} />
        </button>
        <span className="t-h3">{MONTH.format(first)}</span>
        <button className="icon-btn" onClick={() => shift(1)} aria-label="เดือนถัดไป">
          <CaretRightIcon size={18} />
        </button>
      </div>
      <div className="cal-grid mt-8">
        {WEEK.map((w) => (
          <span key={w} className="cal-week">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <span key={`e${i}`} />
          const key = `${m.getFullYear()}-${m.getMonth()}-${d}`
          const n = count.get(key) ?? 0
          return (
            <button
              key={key}
              className={`cal-day press ${key === today ? 'today' : ''} ${key === selected ? 'sel' : ''}`}
              onClick={() => onSelect(key === selected ? null : key)}
              aria-label={`วันที่ ${d}${n ? ` มี ${n} กิจกรรม` : ''}`}
            >
              <span className="num">{d}</span>
              <span className="cal-dots">
                {Array.from({ length: Math.min(n, 3) }, (_, j) => (
                  <i key={j} />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
