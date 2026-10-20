import { CheckIcon } from '@phosphor-icons/react'
import type { Activity } from '../data/types'
import { STAGE_LABEL, STEPS, stage, stepOf, type Stage } from '../lib/stage'

/** Full 6-step workflow bar for one activity. */
export function StageBar({ a, now }: { a: Activity; now: number }) {
  const { index, done } = stepOf(stage(a, now))
  return (
    <ol className="stagebar" aria-label="ขั้นตอนของกิจกรรม">
      {STEPS.map((label, i) => {
        const state = i < index || (i === index && done) ? 'done' : i === index ? 'now' : 'pending'
        return (
          <li key={label} className={`stagebar-step ${state}`} aria-current={state === 'now' ? 'step' : undefined}>
            <span className="stagebar-dot">{state === 'done' ? <CheckIcon size={12} weight="bold" /> : i + 1}</span>
            <span className="stagebar-label">{label}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Compact progress used in lists: six ticks plus the current stage name. */
export function StageMini({ s }: { s: Stage }) {
  const { index, done } = stepOf(s)
  return (
    <span className="row gap-8">
      <span className="stagemini" aria-hidden>
        {STEPS.map((_, i) => (
          <i key={i} className={i < index || (i === index && done) ? 'done' : i === index ? 'now' : ''} />
        ))}
      </span>
      <span className={`t-small t-strong ${s === 'closing' || s === 'submit' ? 't-accent' : s === 'done' ? 't-success' : ''}`}>
        {STAGE_LABEL[s]}
      </span>
    </span>
  )
}
