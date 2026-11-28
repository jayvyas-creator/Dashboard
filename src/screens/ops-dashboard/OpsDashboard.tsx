'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bricolage_Grotesque } from 'next/font/google'
import type { CSSProperties, ReactNode } from 'react'
import { ConnectorIcon } from './ConnectorIcon'
import {
  Activity,
  BatteryCharging,
  Building2,
  ChevronDown,
  ChevronRight,
  Car,
  CalendarClock,
  CalendarDays,
  Clock,
  Globe,
  Lock,
  ChartColumn,
  CreditCard,
  Download,
  Landmark,
  Layers,
  LayoutDashboard,
  Plug,
  Receipt,
  ScrollText,
  Settings,
  SlidersHorizontal,
  TriangleAlert,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { PERIOD } from '@/components/dashboard/data'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/organisms/Sidebar'
import dynamic from 'next/dynamic'
import styles from './OpsDashboard.module.css'
import { DATA_END, DATA_START, DEFAULT_RANGE, MAX_CUSTOM_DAYS, RANGES, customRange, parseISODate, rangeInsights, scaleRange, spanDays, toISODate } from './ranges'
import type { Metric, RangeView } from './ranges'
import { SITES, siteFacts, siteView } from './sites'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-bricolage-local' })

const ACRONYMS = /\b(EV|RFID)\b/
/** Acronyms render in small caps so they sit at body weight instead of shouting. */
const navLabel = (label: string) =>
  label.split(ACRONYMS).map((part, i) => (i % 2 ? <span key={i} className={styles.acronym}>{part}</span> : part))

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Charging stations', icon: Plug },
  { label: 'Energy storages', icon: BatteryCharging },
  { label: 'Sessions', icon: Activity },
  { label: 'Gridify', icon: Layers },
  { label: 'Financials', icon: Receipt },
  { label: 'EV', icon: Car },
  { label: 'Users', icon: Users },
  { label: 'RFID cards', icon: CreditCard },
  { label: 'Assets', icon: Landmark },
  { label: 'Organizations', icon: Building2 },
  { label: 'Statistics', icon: ChartColumn },
  { label: 'Integration settings', icon: Settings },
  { label: 'Technical settings', icon: SlidersHorizontal },
  { label: 'Logs', icon: ScrollText },
]

// Plain-language copy for known error types. The feed only sends the raw type and a time,
// so the meaning and next step are deliberately general: they never name a cause or station.
const ERROR_INFO: Record<string, { title: string; label: string; note: string; meaning: string; action: string }> = {
  OcppStatusNotification: {
    title: 'Charger fault reported',
    label: 'charger fault',
      note: 'Which charger and why is not shown yet',
    meaning: 'A charger reported a problem. Which charger and why is not shown yet.',
    action: 'Open Logs to see which charger and why.',
  },
}
const errorInfo = (type: string) => ERROR_INFO[type] ?? {
  title: 'Unrecognised error',
  label: 'unrecognised error',
    note: 'Not described in this dashboard yet',
  meaning: 'The system reported an error of a type this dashboard does not describe yet.',
  action: 'Open Logs to see the full details.',
}

const DETAIL_TITLE = { stations: 'Stations', connectors: 'Connectors', errors: 'Errors' }
const DETAIL_LINK = { stations: 'Open charging stations', connectors: 'Open charging stations', errors: 'Open logs' }

const MCOLOR: Record<Metric, Record<string, string>> = {
  fees: { '--m': '#35746e', '--m-soft': '#e6f3f1', '--m-mid': '#aec7c5' },
  sessions: { '--m': '#684bd8', '--m-soft': '#f0edfb', '--m-mid': '#c3b7ef' },
  energy: { '--m': '#b55d26', '--m-soft': '#f8efe9', '--m-mid': '#e1bea8' },
}

const StationMapLive = dynamic(() => import('./StationMapLive'), { ssr: false, loading: () => <div className={styles.mapLoading} aria-hidden /> })

function niceCeil(max: number) {
  if (!(max > 0)) return 1
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const unit = max / step > 5 ? step * 2 : step
  return Math.ceil(max / unit) * unit
}


function Chart({ metric, range }: { metric: Metric; range: RangeView }) {
  const { series, fmt } = range.metrics[metric]
  const peak = Math.max(...series.map((p) => p.value))
  // Round gridline steps (1, 2, 2.5, 5 x 10^k) with 3 to 5 intervals, so labels never read 225 or 75.
  const steps = Array.from({ length: 8 }, (_, k) => [1, 2, 2.5, 5].map((m) => m * Math.pow(10, k))).flat()
  const step = steps.find((st) => Math.ceil(peak / st) <= 5) ?? niceCeil(peak) / 4
  const intervals = Math.max(3, Math.ceil(peak / step))
  const top = step * intervals
  const ticks = Array.from({ length: intervals + 1 }, (_, i) => Math.round((intervals - i) * step * 100) / 100)
  const short = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n))
  const ins = rangeInsights(range, metric)
  const n = series.length

  return (
    <div className={styles.chart} style={MCOLOR[metric] as CSSProperties}>
      {metric === 'energy' && <span className={styles.yUnit}>kWh</span>}
      <div className={styles.yAxis}>
        {ticks.map((t, i) => (
          <span key={i}>{metric === 'fees' ? '$' : ''}{short(t)}</span>
        ))}
      </div>
      <div className={styles.plot}>
        <div className={styles.grid}>
          {ticks.map((_t, i) => (
            <i key={i} />
          ))}
        </div>
        <div
          className={`${styles.bars} ${range.dense ? styles.barsDense : ''}`}
          key={`${range.key}-${metric}`}
          onMouseEnter={(e) => { const el = e.currentTarget; window.clearTimeout(Number(el.dataset.warmTimer)); el.dataset.warmTimer = String(window.setTimeout(() => { el.dataset.warm = '' }, 250)) }}
          onMouseLeave={(e) => { const el = e.currentTarget; window.clearTimeout(Number(el.dataset.warmTimer)); delete el.dataset.warm }}
          style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
        >
          {series.map((p, idx) => {
            const cls = p.partial ? styles.barPartial : styles.bar
            return (
              <div key={p.key} className={`${styles.barCol} ${idx < 2 ? styles.tipStart : idx > n - 3 ? styles.tipEnd : ''} ${p.value / top > 0.7 ? styles.tipIn : ''}`} style={{ '--i': idx } as CSSProperties} tabIndex={0} aria-label={`${p.full}: ${fmt(p.value)}${p.partial ? ' (partial month)' : ''}`}>
                <div className={styles.barSlot}>
                  {ins && <i className={styles.avgLine} style={{ bottom: `${(ins.avg / top) * 100}%` }} />}
                  <div className={cls} style={{ height: `${(p.value / top) * 100}%` }}>
                    {!range.dense && <span className={styles.barVal}>{fmt(p.value)}</span>}
                    <span className={styles.barTip} role="tooltip">
                      <small>{p.full}{p.partial ? ', partial' : ''}</small>
                      <b>{fmt(p.value)}</b>
                    </span>
                  </div>
                </div>
                <span className={styles.barLabel}>{(range.dense && n > 24 && idx % 2 === 1 && p.label.length < 4) || (range.unit === 'week' && n > 8 && idx % 2 === 1) ? '' : p.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export type FeedStatus = 'live' | 'stale' | 'loading' | 'error'
export type Slot = 'stations' | 'connectors' | 'sessions' | 'fees' | 'trend' | 'errors' | 'types'
type SlotState = 'ok' | 'loading' | 'missing'

export interface OpsDashboardProps {
  onRetry?: () => void
  /** Which period is selected first. Defaults to the real 6-month range. */
  initialPeriod?: string
  /** Health of the data feed. Drives the header pill and the banner. */
  status?: FeedStatus
  /** How long ago the last successful update was, in ms. Defaults to 0 (just now). */
  staleForMs?: number
  /** Sections the feed did not return. They show "No data" instead of a number. */
  missing?: Partial<Record<Slot, boolean>>
}

const FEED_LABEL: Record<FeedStatus, string> = {
  live: 'Live',
  stale: 'Delayed',
  loading: 'Connecting',
  error: 'Offline',
}

function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  return `${Math.floor(s / 3600)} h ago`
}

const zv = (n: number) => (n === 0 ? styles.zv : undefined)

/** Real button that opens a card's drawer. The card itself also opens it on click, for mouse users. */
function DetailBtn({ label, onOpen }: { label: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      className={styles.chevBtn}
      aria-label={label}
      aria-haspopup="dialog"
      tabIndex={-1}
      onClick={(ev) => { ev.stopPropagation(); onOpen() }}
    >
      <ChevronRight size={16} strokeWidth={1.9} className={styles.chev} aria-hidden="true" />
    </button>
  )
}

function Gate({ s, kind, children, emptyTitle = 'No data for this period', onRetry }: { s: SlotState; kind: 'kpi' | 'body'; children: ReactNode; emptyTitle?: string; onRetry?: () => void }) {
  if (s === 'ok') return <>{children}</>
  if (kind === 'kpi') {
    return s === 'loading' ? (
      <>
        <p className={styles.kpiValue}><span className={styles.skel} style={{ width: 96, height: 34 }} /></p>
        <div className={styles.kpiFoot}><span className={styles.skel} style={{ width: 140, height: 22 }} /></div>
      </>
    ) : (
      <>
        <p className={styles.kpiValue}><span className={styles.dash} aria-label="No data">—</span></p>
        <div className={styles.kpiFoot}><span className={styles.kpiScope}>No data reported</span></div>
      </>
    )
  }
  return s === 'loading' ? (
    <div className={styles.bodySkel} aria-busy="true">
      <span className={styles.sr}>Loading…</span>
      <span className={styles.skel} style={{ width: '40%', height: 28 }} />
      <span className={styles.skel} style={{ width: '100%', height: 14 }} />
      <span className={styles.skel} style={{ width: '85%', height: 14 }} />
      <span className={styles.skel} style={{ width: '65%', height: 14 }} />
    </div>
  ) : (
    <div className={styles.empty}>
      <strong>{emptyTitle}</strong>
      <span>This section will fill in once the feed reports it.</span>
      <button type="button" className={styles.link} onClick={onRetry ?? (() => window.location.reload())}>{onRetry ? 'Check again' : 'Reload dashboard'}</button>
    </div>
  )
}

/** Ticks on its own, so the per-second update never re-renders the whole dashboard. */
function Ago({ last }: { last: number }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  return <>{ago(now - last)}</>
}

export function OpsDashboard({ status = 'live', staleForMs = 0, missing = {}, onRetry, initialPeriod }: OpsDashboardProps = {}) {
  const drawerRef = useRef<HTMLElement>(null)
  const [metric, setMetric] = useState<Metric>('fees')
  const [period, setPeriod] = useState(initialPeriod ?? PERIOD.label)
  const [siteOpen, setSiteOpen] = useState(false)
  const [selectedSites, setSelectedSites] = useState<string[]>(() => SITES.map((x) => x.id))
  const [siteQuery, setSiteQuery] = useState('')
  const [custom, setCustom] = useState<{ start: string; end: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState({ start: '', end: '' })
  const pickerRef = useRef<HTMLDivElement>(null)
  const siteRef = useRef<HTMLDivElement>(null)
  const pickerBtnRef = useRef<HTMLButtonElement>(null)
  const [detail, setDetail] = useState<'stations' | 'connectors' | 'errors' | null>(null)
  const [closing, setClosing] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeDetail = useCallback(() => {
    if (closeTimer.current) return
    setClosing(true)
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null
      setClosing(false)
      setDetail(null)
    }, 200)
  }, [])
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])
  useEffect(() => {
    if (!detail) return
    const opener = document.activeElement as HTMLElement | null
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') { closeDetail(); return }
      if (ev.key !== 'Tab' || !drawerRef.current) return
      const items = drawerRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last?.focus() }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first?.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); opener?.focus?.() }
  }, [detail, closeDetail])
  // The view lives in the URL (?range=…&from=…&to=…&sites=…) so a link reproduces it.
  const [urlReady, setUrlReady] = useState(false)
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search)
      const r = q.get('range')
      const from = q.get('from') ?? ''
      const to = q.get('to') ?? ''
      const iso = /^\d{4}-\d{2}-\d{2}$/
      if (iso.test(from) && iso.test(to) && from >= toISODate(DATA_START) && to <= toISODate(DATA_END) && from <= to && spanDays(parseISODate(from), parseISODate(to)) <= MAX_CUSTOM_DAYS) setCustom({ start: from, end: to })
      else if (r && RANGES[r]) setPeriod(r)
      const ids = (q.get('sites') ?? '').split(',').filter((id) => SITES.some((x) => x.id === id))
      if (ids.length) setSelectedSites(SITES.map((x) => x.id).filter((id) => ids.includes(id)))
    } catch {}
    setUrlReady(true)
  }, [])
  useEffect(() => {
    if (!urlReady) return
    try {
      const q = new URLSearchParams()
      if (custom) { q.set('from', custom.start); q.set('to', custom.end) }
      else if (period !== (initialPeriod ?? PERIOD.label)) q.set('range', period)
      if (selectedSites.length < SITES.length) q.set('sites', selectedSites.join(','))
      const qs = q.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`)
    } catch {}
  }, [urlReady, period, custom, selectedSites, initialPeriod])
  // Shortcuts: "/" opens site search, "e" jumps to Errors.
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.metaKey || ev.ctrlKey || ev.altKey) return
      const t = ev.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      if (ev.key === '/') {
        ev.preventDefault()
        setSiteOpen(true)
        requestAnimationFrame(() => siteRef.current?.querySelector<HTMLInputElement>('input[type="search"], input[type="text"], input:not([type])')?.focus())
      } else if (ev.key === 'e') {
        document.getElementById('err-h')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  useEffect(() => {
    if (!siteOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSiteOpen(false)
    const onDown = (e: MouseEvent) => {
      if (!siteRef.current?.contains(e.target as Node)) setSiteOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [siteOpen])

  useEffect(() => {
    if (!pickerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPickerOpen(false)
        pickerBtnRef.current?.focus()
      }
    }
    const onDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [pickerOpen])

  const [mountedAt] = useState(() => Date.now())
  const last = mountedAt - staleForMs
  // A feed that says live but has not updated for 2 minutes is not live.
  const [stale, setStale] = useState(false)
  useEffect(() => {
    const ms = last + 120_000 - Date.now()
    if (ms <= 0) { setStale(true); return }
    setStale(false)
    const t = setTimeout(() => setStale(true), ms)
    return () => clearTimeout(t)
  }, [last])
  const pill: FeedStatus = status === 'live' && stale ? 'stale' : status
  const slot = (k: Slot): SlotState => (status === 'loading' ? 'loading' : missing[k] ? 'missing' : 'ok')
  const selectedSet = useMemo(() => new Set(selectedSites), [selectedSites])
  const view = useMemo(() => siteView(selectedSet), [selectedSet])
  const { stations, connectors, connectorTotal, connectorTypes, live, errors, shown } = view
  const allSites = selectedSites.length === SITES.length
  const siteLabel = allSites ? `All ${SITES.length} sites` : selectedSites.length === 1 ? (SITES.find((x) => x.id === selectedSites[0])?.name ?? '1 site') : `${selectedSites.length} of ${SITES.length} sites`
  const visibleSites = SITES.filter((x) => x.name.toLowerCase().includes(siteQuery.trim().toLowerCase()))
  const toggleSite = (id: string) =>
    setSelectedSites((cur) => (cur.includes(id) ? (cur.length > 1 ? cur.filter((x) => x !== id) : cur) : SITES.map((x) => x.id).filter((x) => x === id || cur.includes(x))))
  const toggleAllSites = () => setSelectedSites((cur) => (cur.length === SITES.length ? [SITES[0]!.id] : SITES.map((x) => x.id)))
  const baseRange = custom ? customRange(parseISODate(custom.start), parseISODate(custom.end)) : (RANGES[period] ?? DEFAULT_RANGE)
  const range = scaleRange(baseRange, view.share)
  const exportCsv = () => {
    const keys = Object.keys(range.metrics) as Metric[]
    const first = range.metrics[keys[0]!]
    if (!first) return
    const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const rows = [
      [range.tableNoun, ...keys.map((k) => range.metrics[k].label)].map(q).join(','),
      ...first.series.map((b, i) => [b.full, ...keys.map((k) => range.metrics[k].series[i]?.value ?? '')].map(q).join(',')),
    ]
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-${range.range.replace(/[^0-9]+/g, '-').replace(/^-|-$/g, '')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const minDate = toISODate(DATA_START)
  const maxDate = toISODate(DATA_END)
  const draftOk = draft.start >= minDate && draft.end <= maxDate && draft.start !== '' && draft.end !== '' && draft.start <= draft.end
  const draftDays = draftOk ? spanDays(parseISODate(draft.start), parseISODate(draft.end)) : 0
  const draftError =
    draft.start === '' || draft.end === '' ? ''
    : draft.start < minDate || draft.end > maxDate ? 'Pick dates from 05/21/2026 to 11/21/2026.'
    : draft.start > draft.end ? 'The start date must be on or before the end date.'
    : draftDays > MAX_CUSTOM_DAYS ? `Pick a range of ${MAX_CUSTOM_DAYS} days or fewer.` : ''
  const openPicker = () => {
    setDraft(custom ?? { start: '', end: '' })
    setPickerOpen((v) => !v)
  }
  const choosePreset = (o: string) => {
    setPeriod(o)
    setCustom(null)
    setPickerOpen(false)
  }
  const perfSlot = slot
  const onlinePct = stations.total ? (stations.communication.online / stations.total) * 100 : 0

  const offlinePct = stations.total ? Math.round((stations.communication.offline / stations.total) * 100) : 0
  const availPct = connectorTotal ? (connectors.available / connectorTotal) * 100 : 0

  return (
    <div className={`${styles.page} ${bricolage.variable}`}>
      <SidebarProvider className={styles.frame}>
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton size="lg" tooltip="EVES" asChild>
                  <a href="#" onClick={(e) => e.preventDefault()} aria-label="EVES home">
                    <span className={styles.brandMark}>
                      <Zap size={16} strokeWidth={2.4} />
                    </span>
                    <span className={styles.brandName}>EVES</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu aria-label="Primary">
                  {NAV.map(({ label, icon: Icon, active }) => (
                    <SidebarMenuItem key={label}>
                      {active ? (
                        <SidebarMenuButton isActive tooltip={label} asChild>
                          <a href="#" onClick={(e) => e.preventDefault()} aria-current="page">
                            <Icon size={16} strokeWidth={1.8} />
                            <span>{navLabel(label)}</span>
                          </a>
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton className={styles.navSoon} tooltip={`${label}, coming soon`} aria-disabled="true" tabIndex={-1}>
                          <Icon size={16} strokeWidth={1.8} />
                          <span>{navLabel(label)}</span>
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <SidebarInset className={styles.mainCol}>
          <header className={styles.topbar}>
            <SidebarTrigger />
            <span className={styles.topDivider} />
            <nav aria-label="Breadcrumb">
              <ol className={styles.crumbs}>
                <li><a href="#" onClick={(e) => e.preventDefault()} className={styles.crumbLink}>Operational &amp; monitoring</a></li>
                <li aria-hidden className={styles.crumbSep}>/</li>
                <li aria-current="page" className={styles.crumbCurrent}>Dashboard</li>
              </ol>
            </nav>
          </header>
        <div className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Overview</h1>
              <div className={styles.sitePick} ref={siteRef}>
                <button type="button" className={styles.siteBtn} aria-haspopup="dialog" aria-expanded={siteOpen} onClick={() => setSiteOpen((v) => !v)}>
                  <Building2 size={14} strokeWidth={1.9} />
                  {siteLabel}
                  <kbd className={styles.kbd} aria-hidden>/</kbd>
                  <ChevronDown size={14} strokeWidth={1.9} />
                </button>
                {siteOpen && (
                  <div className={styles.sitePop} role="dialog" aria-label="Select sites">
                    <input
                      type="search"
                      className={styles.siteSearch}
                      placeholder="Search sites"
                      aria-label="Search sites"
                      value={siteQuery}
                      onChange={(e) => setSiteQuery(e.target.value)}
                    />
                    <label className={styles.siteOpt}>
                      <input
                        type="checkbox"
                        checked={allSites}
                        ref={(el) => { if (el) el.indeterminate = !allSites }}
                        onChange={toggleAllSites}
                      />
                      All sites <b>{selectedSites.length} of {SITES.length}</b>
                    </label>
                    <ul className={styles.siteList}>
                      {visibleSites.map((x) => (
                        <li key={x.id}>
                          <label className={styles.siteOpt}>
                            <input type="checkbox" checked={selectedSet.has(x.id)} onChange={() => toggleSite(x.id)} />
                            {x.name}
                            <b>{siteFacts(x.id).stations}</b>
                          </label>
                        </li>
                      ))}
                      {visibleSites.length === 0 && <li className={styles.siteHint}>No sites match “{siteQuery}”.</li>}
                    </ul>
                    <p className={styles.siteHint}>Numbers show stations per site. Site breakdowns are sample data until the feed reports sites. At least one site stays selected.</p>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.headerActions}>
              {pill !== 'stale' && (
                <span className={styles[`feed_${pill}`]} role="status">
                  <i />
                  {FEED_LABEL[pill]}
                  {pill !== 'loading' && <small>updated <Ago last={last} /></small>}
                </span>
              )}
              <button type="button" className={styles.secondaryBtn} onClick={exportCsv}>
                <Download size={14} strokeWidth={2} /> Export
              </button>
            </div>
          </header>

          {(status === 'stale' || status === 'error') && (
            <div className={status === 'error' ? styles.bannerBad : styles.bannerWarn} role="alert">
              <TriangleAlert size={16} strokeWidth={1.9} />
              <span>
                {status === 'error'
                  ? "Can’t reach the data feed. Numbers below are from the last update and may be out of date."
                  : 'Live updates are delayed. Numbers may be a few minutes behind.'}
              </span>
              <button type="button" className={styles.bannerBtn} onClick={onRetry ?? (() => window.location.reload())}>Retry connection</button>
            </div>
          )}

          {/* Zone 1: what is happening now. Never affected by the period. */}
          <section className={styles.zone} aria-label="Right now">
            <div className={styles.rowNow}>
              <div className={`${styles.tileCard} ${styles.clickable} ${styles.toneStations}`}>
                <button type="button" className={styles.cardHit} aria-label="Open charging stations details" aria-haspopup="dialog" onClick={() => setDetail('stations')} />
                <span className={styles.cardHead}>
                  <span className={styles.kpiHead}>
                    <h3 className={styles.kpiLabel}>Charging stations</h3>
                  </span>
                  <span className={styles.headRight}><span className={styles.total}>{stations.total} total</span><DetailBtn label="Open charging stations details" onOpen={() => setDetail('stations')} /></span>
                </span>
                <Gate onRetry={onRetry} s={slot('stations')} kind="body">
                  <p className={styles.netHero}>
                    <b className={stations.communication.offline > 0 ? styles.netBad : undefined}>{stations.communication.offline}</b>
                    <span>of {stations.total} stations offline<small>{offlinePct}%</small></span>
                  </p>
                  <div className={styles.stack} role="img" aria-label={`${stations.communication.online} online, ${stations.communication.offline} offline`}>
                    <i style={{ width: `${onlinePct}%`, background: 'var(--good)' }} />
                    <i style={{ width: `${100 - onlinePct}%`, background: 'var(--offline)' }} />
                  </div>
                  <ul className={styles.legend}>
                    <li><span className={styles.dotOff} />Offline<b>{stations.communication.offline}</b></li>
                    <li><span className={styles.dotOn} />Online<b>{stations.communication.online}</b></li>
                  </ul>
                  <div className={styles.cols}>
                    <div>
                      <span className={styles.grpLabel}>Category</span>
                      <ul className={styles.pairs1}>
                        <li><span className={styles.lblIcon}><Globe size={13} />Public</span><b className={zv(stations.category.public)}>{stations.category.public}</b></li>
                        <li><span className={styles.lblIcon}><Lock size={13} />Private</span><b className={zv(stations.category.private)}>{stations.category.private}</b></li>
                      </ul>
                    </div>
                    <div>
                      <span className={styles.grpLabel}>New chargers</span>
                      <ul className={styles.pairs1}>
                        <li><span className={styles.lblIcon}><Clock size={13} />Pending</span><b className={zv(stations.newCharger.pending)}>{stations.newCharger.pending}</b></li>
                        <li><span className={styles.lblIcon}><CalendarClock size={13} />Coming soon</span><b className={zv(shown.comingSoon)}>{shown.comingSoon}</b></li>
                      </ul>
                    </div>
                  </div>
                </Gate>
              </div>
              <div className={`${styles.tileCard} ${styles.clickable} ${styles.toneConn}`}>
                <button type="button" className={styles.cardHit} aria-label="Open connectors details" aria-haspopup="dialog" onClick={() => setDetail('connectors')} />
                <span className={styles.cardHead}>
                  <span className={styles.kpiHead}>
                    <h3 className={styles.kpiLabel}>Connectors</h3>
                  </span>
                  <span className={styles.headRight}><span className={styles.total}>{connectorTotal} total</span><DetailBtn label="Open connectors details" onOpen={() => setDetail('connectors')} /></span>
                </span>
                <Gate onRetry={onRetry} s={slot('connectors')} kind="body">
                  <div className={styles.stack} role="img" aria-label="Connectors by status">
                    <i style={{ width: `${availPct}%`, background: 'var(--accent)' }} />
                    <i style={{ width: `${connectorTotal ? (connectors.unavailable / connectorTotal) * 100 : 0}%`, background: 'var(--neutral)' }} />
                  </div>
                  <ul className={styles.statusRows}>
                    <li><span style={{ background: 'var(--accent)' }} />Available<b className={zv(connectors.available)}>{connectors.available}</b></li>
                    <li><span style={{ background: 'var(--neutral)' }} />Unavailable<b className={zv(connectors.unavailable)}>{connectors.unavailable}</b></li>
                    <li><span className={styles.hollow} />Occupied<b className={zv(shown.occupied)}>{shown.occupied}</b></li>
                    <li><span className={styles.hollow} />Reserved<b className={zv(shown.reserved)}>{shown.reserved}</b></li>
                    <li><span className={styles.hollow} />Faulted<b className={zv(shown.faulted)}>{shown.faulted}</b></li>
                  </ul>
                </Gate>
              </div>
              <div className={`${styles.tileCard} ${styles.clickable} ${styles.toneType}`}>
                <button type="button" className={styles.cardHit} aria-label="Open connector types details" aria-haspopup="dialog" onClick={() => setDetail('connectors')} />
                <span className={styles.cardHead}>
                  <span className={styles.kpiHead}>
                    <h3 className={styles.kpiLabel}>Connector types</h3>
                  </span>
                  <span className={styles.headRight}><span className={styles.total}>{connectorTypes.length} types</span><DetailBtn label="Open connector types details" onOpen={() => setDetail('connectors')} /></span>
                </span>
                <Gate onRetry={onRetry} s={slot('types')} kind="body">
                  <ul className={styles.typeRows}>
                    {[...connectorTypes].sort((a, b) => b.count - a.count).map((x) => (
                      <li key={x.name}>
                        <span className={styles.typeName}><ConnectorIcon type={x.name} />{x.name}</span>
                        <i><em style={{ width: `${Math.max(3, (x.count / Math.max(...connectorTypes.map((y) => y.count), 1)) * 100)}%` }} /></i>
                        <b>{x.count}</b>
                      </li>
                    ))}
                  </ul>
                </Gate>
              </div>
              <div className={`${styles.tileCard} ${styles.toneSess}`}>
                <span className={styles.cardHead}>
                  <span className={styles.kpiHead}>
                    <h3 className={styles.kpiLabel}>Sessions</h3>
                  </span>
                </span>
                <Gate onRetry={onRetry} s={slot('sessions')} kind="body" emptyTitle="No data reported">
                  <ul className={`${styles.statusRows} ${styles.sessRows}`}>
                    <li><span style={{ background: 'var(--accent)' }} />Active session<b className={zv(live.activeSessions)}>{live.activeSessions}</b></li>
                    <li><span style={{ background: shown.sessionErrors > 0 ? 'var(--bad)' : 'var(--neutral)' }} />Session error<b className={shown.sessionErrors > 0 ? styles.netBad : zv(shown.sessionErrors)}>{shown.sessionErrors}</b></li>
                  </ul>
                </Gate>
              </div>
            </div>
          </section>

          {/* Zone 2: how are we doing. The period switcher lives here only. */}
          <section className={styles.zone} aria-labelledby="perf-h">
            <div className={styles.zoneHead}>
              <div className={styles.zoneTitleGroup}>
                <h2 id="perf-h" className={styles.zoneTitle}>Performance</h2>
                <div className={styles.rangePick} ref={pickerRef}>
                  <button ref={pickerBtnRef} type="button" className={styles.rangeBtn} aria-haspopup="dialog" aria-expanded={pickerOpen} onClick={openPicker}>
                    <CalendarDays size={14} strokeWidth={1.9} />
                    {range.range}
                    <ChevronDown size={14} strokeWidth={1.9} />
                  </button>
                  {pickerOpen && (
                    <div className={styles.rangePop} role="dialog" aria-label="Choose date range">
                      <form
                        className={styles.customForm}
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (!draftOk || draftDays > MAX_CUSTOM_DAYS) return
                          setCustom({ ...draft })
                          setPickerOpen(false)
                          pickerBtnRef.current?.focus()
                        }}
                      >
                        <p className={styles.customTitle}>Custom range</p>
                        <div className={styles.dateRow}>
                          <label className={styles.dateField} data-invalid={draftError ? '' : undefined}>
                            Start
                            <input type="date" min={minDate} max={maxDate} value={draft.start} onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))} />
                          </label>
                          <label className={styles.dateField} data-invalid={draftError ? '' : undefined}>
                            End
                            <input type="date" min={minDate} max={maxDate} value={draft.end} onChange={(e) => setDraft((d) => ({ ...d, end: e.target.value }))} />
                          </label>
                        </div>
                        {draftError ? <p className={styles.dateError} role="alert">{draftError}</p> : <p className={styles.siteHint}>Custom ranges show sample data until the feed supports them.</p>}
                        <button type="submit" className={styles.primaryBtn} disabled={!draftOk || draftDays > MAX_CUSTOM_DAYS}>Apply range</button>
                      </form>
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.segmented} role="group" aria-label="Period">
                {PERIOD.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className={!custom && o === period ? styles.segActive : styles.seg}
                    onClick={() => choosePreset(o)}
                    aria-pressed={!custom && o === period}
                    data-text={o}
                  >
                    <span>{o}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.rowPerf}>
              <article className={styles.card}>
                <div className={styles.tiles} role="group" aria-label="Metric">
                  {(Object.keys(range.metrics) as Metric[]).map((k) => {
                    const s = perfSlot(k === 'fees' ? 'fees' : k === 'sessions' ? 'sessions' : 'trend')
                    return (
                      <button
                        key={k}
                        type="button"
                        className={k === metric ? styles.tileActive : styles.tile}
                        style={MCOLOR[k] as CSSProperties}
                        onClick={() => setMetric(k)}
                        aria-pressed={k === metric}
                      >
                        <span className={styles.tileLabel}>{range.metrics[k].label}</span>
                        {s === 'ok' ? (
                          <>
                            <span className={styles.tileTop}>
                              <span className={styles.tileValue}>{range.metrics[k].total}</span>
                            </span>
                            <span className={styles.tileSub}>{range.metrics[k].sub}</span>
                          </>
                        ) : s === 'loading' ? (
                          <>
                            <span className={styles.skel} style={{ width: 90, height: 28 }} />
                            <span className={styles.skel} style={{ width: 120, height: 14 }} />
                          </>
                        ) : (
                          <>
                            <span className={styles.tileValue}><span className={styles.dash}>—</span></span>
                            <span className={styles.tileSub}>No data reported</span>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
                <Gate onRetry={onRetry} s={perfSlot('trend')} kind="body">
                  {(() => {
                    const ins = rangeInsights(range, metric)
                    if (!ins) return null
                    return (
                      <ul key={`${range.key}-${metric}`} className={styles.insights} style={MCOLOR[metric] as CSSProperties}>
                        <li><span>{range.bestLabel}</span><b>{ins.best.label}: {ins.fmt(ins.best.value)}</b></li>
                        <li><span>{range.avgLabel}</span><b>{ins.fmt(Math.round(ins.avg))}</b></li>
                        {ins.change !== null && (
                          <li><span>{ins.changeLabel}</span><b className={ins.change >= 0 ? styles.up : styles.down}>{ins.change >= 0 ? '+' : ''}{ins.change.toFixed(1)}%</b></li>
                        )}
                        {range.hasPartial ? (
                          <li className={styles.legend} title="Values are approximate"><i className={styles.swFull} />{range.unit === 'week' ? 'Full week' : 'Full month'}<i className={styles.swPartial} />{range.partialLabel ?? 'Partial month'}</li>
                        ) : null}
                      </ul>
                    )
                  })()}
                  <Chart metric={metric} range={range} />
                </Gate>
              </article>
            </div>
          </section>

          <div className={styles.mapErrRow}>
          <section className={styles.zone} aria-labelledby="map-h">
            <div className={styles.zoneHead}>
              <div className={styles.zoneTitleGroup}>
                <h2 id="map-h" className={styles.zoneTitle}>Station map</h2>
              </div>
            </div>
            <div className={styles.mapCard}>
              <StationMapLive />
              <ul className={styles.mapLegend} aria-label="Map key">
                <li><svg width="14" height="14" viewBox="-11 -11 22 22" aria-hidden><circle r="9" fill="var(--good)" /><path d="M-4 0.5 L-1 3.5 L4.5 -3" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>Online</li>
                <li><svg width="14" height="14" viewBox="-11 -11 22 22" aria-hidden><rect x="-7" y="-7" width="14" height="14" rx="2" transform="rotate(45)" fill="var(--bad)" /><path d="M-4 0 L4 0" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>Offline</li>
              </ul>
            </div>
          </section>
          <section className={styles.zone} aria-labelledby="err-h">
            <div className={styles.zoneHead}>
              <div className={styles.zoneTitleGroup}>
                <h2 id="err-h" className={styles.zoneTitle}>Errors</h2>
                <button type="button" className={styles.link} onClick={() => setDetail('errors')} aria-haspopup="dialog">View all errors</button>
              </div>
            </div>
        <div className={`${styles.tileCard} ${styles.clickable} ${styles.errCard}`}>
                <button type="button" className={styles.cardHit} aria-label="Open errors details" aria-haspopup="dialog" onClick={() => setDetail('errors')} />
          <Gate onRetry={onRetry} s={slot('errors')} kind="body">
            {errors.length === 0 && <p className={styles.inlineNote}>No errors reported. All clear.</p>}
            {errors.length > 0 && (
              <div className={styles.errFeed}>
                <ul className={styles.errList}>
                  {errors.slice(0, 3).map((x) => (
                    <li key={x.id}>
                      <i className={styles.errIcon} aria-hidden><TriangleAlert size={16} /></i>
                      <div className={styles.errRowText}>
                        <span className={styles.errRowTitle}>{errorInfo(x.type).title}</span>
                        <time dateTime={x.iso}>{x.relative}</time>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Gate>
        </div>
          </section>
          </div>
        </div>
        </SidebarInset>
      </SidebarProvider>

      {detail && (
        <>
          <div className={styles.scrim} data-closing={closing || undefined} onClick={closeDetail} />
          <aside ref={drawerRef} className={styles.drawer} data-closing={closing || undefined} role="dialog" aria-modal="true" aria-label={DETAIL_TITLE[detail]}>
            <header className={styles.drawerHead}>
              <h2 className={styles.drawerTitle}>{DETAIL_TITLE[detail]}</h2>
              <button type="button" className={styles.iconBtn}  onClick={closeDetail} aria-label="Close details" autoFocus>
                <X size={16} strokeWidth={1.8} />
              </button>
            </header>
            <div className={styles.drawerBody}>
              {detail === 'stations' && (
                <Gate onRetry={onRetry} s={slot('stations')} kind="body">
                  <p className={styles.heroValue}>{stations.communication.offline}<small> of {stations.total} offline ({offlinePct}%)</small></p>
                  <div className={styles.split}>
                    <i style={{ width: `${onlinePct}%` }} className={styles.splitOn} />
                    <i style={{ width: `${100 - onlinePct}%` }} className={styles.splitOff} />
                  </div>
                  <ul className={styles.legend}>
                    <li><span className={styles.dotOn} />Online<b>{stations.communication.online}</b></li>
                    <li><span className={styles.dotOff} />Offline<b>{stations.communication.offline}</b></li>
                  </ul>
                  <h4 className={styles.subHead}>By category</h4>
                  <ul className={styles.types}>
                    <li><span className={styles.typeName}>Public</span><b>{stations.category.public}</b></li>
                    <li><span className={styles.typeName}>Private</span><b>{stations.category.private}</b></li>
                  </ul>
                  <h4 className={styles.subHead}>New charger status</h4>
                  <ul className={styles.types}>
                    <li><span className={styles.typeName}>Pending setup</span><b>{stations.newCharger.pending}</b></li>
                    <li><span className={styles.typeName}>Coming soon</span><b>{shown.comingSoon}</b></li>
                  </ul>
                </Gate>
              )}
              {detail === 'connectors' && (
                <Gate onRetry={onRetry} s={slot('connectors')} kind="body">
                  <p className={styles.heroValue}>{connectors.available}<small> of {connectorTotal} available</small></p>
                  <div className={styles.split}>
                    <i style={{ width: `${availPct}%` }} className={styles.splitAvail} />
                    <i style={{ width: `${100 - availPct}%` }} className={styles.splitNone} />
                  </div>
                  <ul className={styles.legend}>
                    <li><span className={styles.dotAvail} />Available<b>{connectors.available}</b></li>
                    <li><span className={styles.dotNone} />Unavailable<b>{connectors.unavailable}</b></li>
                    <li><span className={styles.dotNone} />Occupied<b>{shown.occupied}</b></li>
                    <li><span className={styles.dotNone} />Reserved<b>{shown.reserved}</b></li>
                    <li><span className={styles.dotNone} />Faulted<b>{shown.faulted}</b></li>
                  </ul>
                  <p className={styles.inlineNote}>{live.activeSessions} active, {shown.sessionErrors} session errors</p>
                  <h4 className={styles.subHead}>By type</h4>
                  <Gate onRetry={onRetry} s={slot('types')} kind="body">
                    <ul className={styles.types}>
                      {[...connectorTypes].sort((a, b) => b.count - a.count).map((x) => (
                        <li key={x.name}><span className={styles.typeName}><ConnectorIcon type={x.name} size={14} /> {x.name}</span><b>{x.count}</b></li>
                      ))}
                    </ul>
                  </Gate>
                </Gate>
              )}
              {detail === 'errors' && (
                <Gate onRetry={onRetry} s={slot('errors')} kind="body">
                  <p className={styles.heroValue}>{errors.length}<small> recent {errors.length === 1 ? 'error' : 'errors'}</small></p>
                  {errors.length === 0 ? (
                    <p className={styles.inlineNote}>No errors reported. All clear.</p>
                  ) : (
                    <>
                    <dl className={styles.errExplain}>
                      <div><dt>What it means</dt><dd>{errorInfo(errors[0]?.type ?? "").meaning}</dd></div>
                      <div><dt>What to do</dt><dd>{errorInfo(errors[0]?.type ?? "").action}</dd></div>
                    </dl>
                    <ul className={styles.types}>
                      {errors.map((x) => (
                        <li key={x.id}>
                          <span className={styles.typeName}>{errorInfo(x.type).title}<small className={styles.errRaw}>{x.type}</small></span>
                          <time dateTime={x.iso}>{x.absolute}</time>
                        </li>
                      ))}
                    </ul>
                    </>
                  )}
                </Gate>
              )}
            </div>
            <footer className={styles.drawerFoot}>
              <a href="#" onClick={(e) => e.preventDefault()} className={styles.link}>{DETAIL_LINK[detail]}</a>
            </footer>
          </aside>
        </>
      )}
    </div>
  )
}

export default OpsDashboard
