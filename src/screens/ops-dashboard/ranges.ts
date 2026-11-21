import { PERIOD, energyByMonth, feesByMonth, sessionsByMonth, totals } from '@/components/dashboard/data'
import { duration, int, kwh, usd } from '@/components/dashboard/format'

/**
 * Per-range performance data for the period switcher.
 *
 * "6 months" is the real feed (data.ts). The shorter ranges are ILLUSTRATIVE SAMPLE data:
 * the feed does not report them yet. They are derived from one sessions series per range,
 * scaled to the 6-month averages (about 10 sessions a day, 18.5 kWh and $11.90 per session),
 * so totals, charts and tiles stay consistent with each other and with the real range.
 */

export type Metric = 'fees' | 'sessions' | 'energy'
export type RangeKey = string

export interface Bucket {
  key: string
  /** Short axis label. */
  label: string
  /** Longer label for tooltips and the table. */
  full: string
  value: number
  partial?: boolean
}

export interface MetricView {
  label: string
  series: Bucket[]
  total: string
  sub: string
  fmt: (n: number) => string
}

export interface RangeView {
  key: RangeKey
  /** Date range shown beside the Performance title. */
  range: string
  /** Word for one bar: month, day or hour. */
  unit: 'month' | 'week' | 'day' | 'hour'
  /** Label for the table link and drawer, e.g. "View monthly table". */
  tableLink: string
  tableNoun: string
  /** Many narrow bars: value labels move to hover and the gaps tighten. */
  dense: boolean
  /** Whether bars can be partial (the real monthly range and custom weekly ranges). */
  hasPartial: boolean
  /** Legend text for partial bars. Defaults to "Partial month". */
  partialLabel?: string
  bestLabel: string
  avgLabel: string
  /** Compare the last `cur` buckets against the `prev` before them. */
  compare: { cur: number; prev: number; label: (full: Bucket[]) => string }
  metrics: Record<Metric, MetricView>
}

const FMT: Record<Metric, (n: number) => string> = {
  fees: (n) => '$' + int(n),
  sessions: (n) => int(n),
  energy: (n) => int(n) + ' kWh',
}

const sum = (xs: number[]) => xs.reduce((t, x) => t + x, 0)

/** Small deterministic wobble so per-bucket ratios are not identical. Same index, same value. */
const wob = (i: number, mod: number, step: number) => ((i * 7 + 3) % mod - (mod - 1) / 2) * step

const kwhPer = (s: number, i: number) => (s ? Math.round(s * (18.5 + wob(i, 5, 0.9))) : 0)
const feePer = (s: number, i: number) => (s ? Math.round(s * (11.9 + wob(i, 5, 0.7))) : 0)

function metricsFor(buckets: { key: string; label: string; full: string; sessions: number; idx: number }[]): Record<Metric, MetricView> {
  const mk = (pick: (b: (typeof buckets)[number]) => number): Bucket[] =>
    buckets.map((b) => ({ key: b.key, label: b.label, full: b.full, value: pick(b) }))
  const sessionsSeries = mk((b) => b.sessions)
  const energySeries = mk((b) => kwhPer(b.sessions, b.idx))
  const feesSeries = mk((b) => feePer(b.sessions, b.idx))
  const s = sum(sessionsSeries.map((b) => b.value))
  const e = sum(energySeries.map((b) => b.value))
  const f = sum(feesSeries.map((b) => b.value))
  const tx = Math.max(1, Math.round(f / totals.avgCost))
  return {
    fees: { label: 'Financials', series: feesSeries, total: usd(f).replace('.00', ''), sub: `${usd(f / tx)} avg · ${int(tx)} transactions`, fmt: FMT.fees },
    sessions: { label: 'Sessions', series: sessionsSeries, total: int(s), sub: `Avg ${duration(totals.avgDurationMin)}`, fmt: FMT.sessions },
    energy: { label: 'Energy', series: energySeries, total: int(e) + ' kWh', sub: `${kwh(s ? e / s : 0, 1)} kWh avg per session`, fmt: FMT.energy },
  }
}

// ---- 30 days: Oct 23 to Nov 21, 2026 (Fri to Sat). Weekday peaks, quieter weekends. ----
const DAY_SESSIONS = [
  10, 8, 7, 11, 12, 12, 11, 10, 8, 7, 11, 13, 12, 12, 10, 9, 7, 12, 13, 13, 12, 11, 9, 8, 12, 13, 14, 13, 11, 8,
]
const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const dayBuckets = (() => {
  const start = new Date(2026, 9, 23)
  return DAY_SESSIONS.map((sessions, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const mon = d.toLocaleString('en-US', { month: 'short' })
    return { key: `d${i}`, label: i === 0 || d.getDate() === 1 ? `${mon} ${d.getDate()}` : String(d.getDate()), full: `${WEEKDAY[d.getDay()]}, ${mon} ${d.getDate()}`, sessions, idx: i }
  })
})()

// ---- 7 days: the last seven of the 30 (Nov 15 to Nov 21), so both ranges agree. ----
const weekBuckets = dayBuckets.slice(-7).map((b) => ({ ...b, label: b.full.slice(0, 3) }))

// ---- 24 hours: sessions per clock hour. Morning and evening peaks, quiet overnight. ----
const HOUR_SESSIONS = [0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 2, 1, 1, 0, 0, 0, 0]
const hourBuckets = HOUR_SESSIONS.map((sessions, h) => ({
  key: `h${h}`,
  label: String(h).padStart(2, '0'),
  full: `${String(h).padStart(2, '0')}:00 to ${String(h + 1).padStart(2, '0')}:00`,
  sessions,
  idx: h + 40,
}))

const sumLast = (xs: Bucket[], n: number) => sum(xs.slice(-n).map((b) => b.value))

const monthSeries = (series: { month: string; value: number; partial?: boolean; covers?: string }[]): Bucket[] =>
  series.map((p) => ({ key: p.month, label: p.month.slice(0, 3), full: p.covers ? `${p.month} (${p.covers})` : p.month, value: p.value, partial: p.partial }))

const sixMonths: RangeView = {
  key: PERIOD.label,
  range: PERIOD.range,
  unit: 'month',
  tableLink: 'View monthly table',
  tableNoun: 'month',
  dense: false,
  hasPartial: true,
  bestLabel: 'Best month',
  avgLabel: 'Full-month average',
  compare: { cur: 1, prev: 1, label: (full) => `${full.at(-1)?.label ?? ''} vs ${full.at(-2)?.label ?? ''}` },
  metrics: {
    fees: { label: 'Financials', series: monthSeries(feesByMonth), total: usd(Math.round(totals.fees)).replace('.00', ''), sub: `${usd(totals.avgCost)} avg · ${int(totals.transactions)} transactions`, fmt: FMT.fees },
    sessions: { label: 'Sessions', series: monthSeries(sessionsByMonth), total: int(totals.sessions), sub: `Avg ${duration(totals.avgDurationMin)}`, fmt: FMT.sessions },
    energy: { label: 'Energy', series: monthSeries(energyByMonth), total: kwh(totals.energyKwh, 0) + ' kWh', sub: `${kwh(totals.avgEnergyKwh, 1)} kWh avg per session`, fmt: FMT.energy },
  },
}

const thirtyDays: RangeView = {
  key: '30 days',
  range: '10/23/2026 – 11/21/2026',
  unit: 'day',
  tableLink: 'View daily table',
  tableNoun: 'day',
  dense: true,
  hasPartial: false,
  bestLabel: 'Best day',
  avgLabel: 'Daily average',
  compare: { cur: 7, prev: 7, label: () => 'Last 7d vs prior 7d' },
  metrics: metricsFor(dayBuckets),
}

const sevenDays: RangeView = {
  key: '7 days',
  range: '11/15/2026 – 11/21/2026',
  unit: 'day',
  tableLink: 'View daily table',
  tableNoun: 'day',
  dense: false,
  hasPartial: false,
  bestLabel: 'Best day',
  avgLabel: 'Daily average',
  compare: { cur: 1, prev: 1, label: (full) => `${full.at(-1)?.label ?? ''} vs ${full.at(-2)?.label ?? ''}` },
  metrics: metricsFor(weekBuckets),
}

const day: RangeView = {
  key: '24 hours',
  range: '11/20/2026 – 11/21/2026',
  unit: 'hour',
  tableLink: 'View hourly table',
  tableNoun: 'hour',
  dense: true,
  hasPartial: false,
  bestLabel: 'Peak hour',
  avgLabel: 'Hourly average',
  compare: { cur: 12, prev: 12, label: () => 'Last 12h vs prior 12h' },
  metrics: metricsFor(hourBuckets),
}

export const RANGES: Record<string, RangeView> = {
  [sixMonths.key]: sixMonths,
  [thirtyDays.key]: thirtyDays,
  [sevenDays.key]: sevenDays,
  [day.key]: day,
}

export function rangeInsights(r: RangeView, metric: Metric) {
  const { series, fmt } = r.metrics[metric]
  const full = series.filter((b) => !b.partial)
  if (full.length < 2) return null
  const best = full.reduce((a, b) => (b.value > a.value ? b : a))
  const avg = sum(full.map((b) => b.value)) / full.length
  const { cur, prev } = r.compare
  const curSum = sumLast(full, cur)
  const prevSum = sum(full.slice(-(cur + prev), -cur).map((b) => b.value))
  const change = prevSum ? ((curSum - prevSum) / prevSum) * 100 : null
  return { best, avg, change, changeLabel: r.compare.label(full), fmt }
}

export const DEFAULT_RANGE: RangeView = sixMonths

// ---- Custom range: ILLUSTRATIVE SAMPLE data, like the 30 day, 7 day and 24 hour ranges. ----
/** First and last day the picker accepts. Matches the real 6 month range in data.ts. */
export const DATA_START = new Date(2026, 4, 21)
export const DATA_END = new Date(2026, 10, 21)
export const MAX_CUSTOM_DAYS = 180

const DAY_MS = 86_400_000
const pad2 = (n: number) => String(n).padStart(2, '0')
const WEEKDAY_BASE = [8, 11, 13, 13, 12, 11, 8] // Sun to Sat: weekday peaks, quieter weekends

export const toISODate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
export const parseISODate = (s: string) => {
  const [y = 0, m = 1, d = 1] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
const fmtDate = (d: Date) => `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`
const dayNumber = (d: Date) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS)
const monthDay = (d: Date) => `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}`

/** Days in the range, inclusive. */
export const spanDays = (start: Date, end: Date) => dayNumber(end) - dayNumber(start) + 1

/**
 * Up to 31 days draws one bar per day. Longer ranges draw one bar per week, counted back from
 * the end date, so the only short week is the oldest one and it is marked partial.
 */
export function customRange(start: Date, end: Date): RangeView {
  const days = spanDays(start, end)
  const daily = Array.from({ length: days }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const n = dayNumber(d)
    // Same date, same value, whatever range it is viewed in.
    return { d, n, sessions: Math.max(4, (WEEKDAY_BASE[d.getDay()] ?? 10) + ((n * 7 + 3) % 5) - 2) }
  })
  const range = `${fmtDate(start)} – ${fmtDate(end)}`

  if (days <= 31) {
    const buckets = daily.map(({ d, n, sessions }, i) => ({
      key: `c${n}`,
      label: i === 0 || d.getDate() === 1 ? monthDay(d) : String(d.getDate()),
      full: `${WEEKDAY[d.getDay()]}, ${monthDay(d)}`,
      sessions,
      idx: n,
    }))
    const weekly = days >= 14
    return {
      key: `custom:${toISODate(start)}:${toISODate(end)}`,
      range,
      unit: 'day',
      tableLink: 'View daily table',
      tableNoun: 'day',
      dense: days > 10,
      hasPartial: false,
      bestLabel: 'Best day',
      avgLabel: 'Daily average',
      compare: weekly
        ? { cur: 7, prev: 7, label: () => 'Last 7d vs prior 7d' }
        : { cur: 1, prev: 1, label: (full) => `${full.at(-1)?.label ?? ''} vs ${full.at(-2)?.label ?? ''}` },
      metrics: metricsFor(buckets),
    }
  }

  const buckets: { key: string; label: string; full: string; sessions: number; idx: number; partial: boolean }[] = []
  for (let hi = daily.length; hi > 0; hi -= 7) {
    const chunk = daily.slice(Math.max(0, hi - 7), hi)
    const first = chunk[0]!
    const last = chunk[chunk.length - 1]!
    buckets.unshift({
      key: `w${first.n}`,
      label: monthDay(first.d),
      full: `${monthDay(first.d)} – ${monthDay(last.d)}`,
      sessions: sum(chunk.map((c) => c.sessions)),
      idx: first.n,
      partial: chunk.length < 7,
    })
  }
  const metrics = metricsFor(buckets)
  ;(Object.keys(metrics) as Metric[]).forEach((k) => {
    metrics[k].series = metrics[k].series.map((b, i) => ({ ...b, partial: buckets[i]?.partial || undefined }))
  })
  return {
    key: `custom:${toISODate(start)}:${toISODate(end)}`,
    range,
    unit: 'week',
    tableLink: 'View weekly table',
    tableNoun: 'week',
    dense: buckets.length > 10,
    hasPartial: buckets.some((b) => b.partial),
    partialLabel: 'Partial week',
    bestLabel: 'Best week',
    avgLabel: 'Full-week average',
    compare: { cur: 1, prev: 1, label: () => 'Last week vs prior week' },
    metrics,
  }
}
