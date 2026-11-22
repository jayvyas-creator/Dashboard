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
  PanelLeft,
  Layers,
  LayoutDashboard,
  Plug,
  Radio,
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
import styles from './OpsDashboard.module.css'
import { DATA_END, DATA_START, DEFAULT_RANGE, MAX_CUSTOM_DAYS, RANGES, customRange, parseISODate, rangeInsights, scaleRange, spanDays, toISODate } from './ranges'
import type { Metric, RangeView } from './ranges'
import { SITES, siteFacts, siteView } from './sites'

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], display: 'swap', variable: '--font-bricolage-local' })

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, active: true },
  { label: 'Charging Stations', icon: Plug },
  { label: 'Energy Storages', icon: BatteryCharging },
  { label: 'Sessions', icon: Activity },
  { label: 'Gridify', icon: Layers },
  { label: 'Financials', icon: Receipt },
  { label: 'EV', icon: Car },
  { label: 'Users', icon: Users },
  { label: 'RFID Cards', icon: CreditCard },
  { label: 'Assets', icon: Landmark },
  { label: 'Organizations', icon: Building2 },
  { label: 'Statistics', icon: ChartColumn },
  { label: 'Integration Settings', icon: Settings },
  { label: 'Technical Settings', icon: SlidersHorizontal },
  { label: 'Logs', icon: ScrollText },
]

const DETAIL_TITLE = { stations: 'Stations', connectors: 'Connectors', errors: 'Errors', perf: 'Performance' }
const DETAIL_LINK = { stations: 'Open Charging Stations', connectors: 'Open Charging Stations', errors: 'Open Logs', perf: 'Open Statistics' }

const MCOLOR: Record<Metric, Record<string, string>> = {
  fees: { '--m': '#0f766e', '--m-soft': '#e3f4f1', '--m-mid': '#9fd8d0' },
  sessions: { '--m': '#0f766e', '--m-soft': '#e3f4f1', '--m-mid': '#9fd8d0' },
  energy: { '--m': '#0f766e', '--m-soft': '#e3f4f1', '--m-mid': '#9fd8d0' },
}

function Ring({ value, total, base, arc, label, sub, caption }: { value: number; total: number; base: string; arc: string; label: string; sub: string; caption: string }) {
  const r = 38
  const c = 2 * Math.PI * r
  const frac = total > 0 ? value / total : 0
  return (
    <svg className={styles.ring} viewBox="0 0 96 96" role="img" aria-label={caption}>
      <circle cx="48" cy="48" r={r} fill="none" stroke={base} strokeWidth="11" />
      <circle cx="48" cy="48" r={r} fill="none" stroke={arc} strokeWidth="11" strokeLinecap="butt" className={styles.ringArc} strokeDasharray={`${frac * c} ${c}`} transform="rotate(-90 48 48)" />
      <text x="48" y="44" textAnchor="middle" dominantBaseline="central" className={styles.ringText} fontSize="17">{label}</text>
      <text x="48" y="60" textAnchor="middle" dominantBaseline="central" className={styles.ringSub}>{sub}</text>
    </svg>
  )
}


function niceCeil(max: number) {
  if (!(max > 0)) return 1
  const step = Math.pow(10, Math.floor(Math.log10(max)))
  const unit = max / step > 5 ? step * 2 : step
  return Math.ceil(max / unit) * unit
}


function Chart({ metric, range }: { metric: Metric; range: RangeView }) {
  const { series, fmt } = range.metrics[metric]
  const peak = Math.max(...series.map((p) => p.value))
  const raw = niceCeil(peak)
  // Small ranges (sessions or dollars per hour) need a top divisible by 4 so the gridlines are whole numbers.
  const top = raw < 100 ? Math.max(4, Math.ceil(raw / 4) * 4) : raw
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((t) => Math.round(top * t * 100) / 100)
  const short = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n))
  const ins = rangeInsights(range, metric)
  const n = series.length

  return (
    <div className={styles.chart} style={MCOLOR[metric] as CSSProperties}>
      <div className={styles.yAxis}>
        {ticks.map((t, i) => (
          <span key={i}>{short(t)}</span>
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
                      <small>{p.full}{p.partial ? ' · partial' : ''}</small>
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

function Gate({ s, kind, children, emptyTitle = 'No data for this period' }: { s: SlotState; kind: 'kpi' | 'body'; children: ReactNode; emptyTitle?: string }) {
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
    </div>
  )
}

export function OpsDashboard({ status = 'live', staleForMs = 0, missing = {}, onRetry, initialPeriod }: OpsDashboardProps = {}) {
  const drawerRef = useRef<HTMLElement>(null)
  const [metric, setMetric] = useState<Metric>('fees')
  const [period, setPeriod] = useState(initialPeriod ?? PERIOD.label)
  const [collapsed, setCollapsed] = useState(false)
  // Below 820px the sidebar becomes an off-canvas drawer opened from the top bar.
  const [mobile, setMobile] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [siteOpen, setSiteOpen] = useState(false)
  const [selectedSites, setSelectedSites] = useState<string[]>(() => SITES.map((x) => x.id))
  const [siteQuery, setSiteQuery] = useState('')
  const [custom, setCustom] = useState<{ start: string; end: string } | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draft, setDraft] = useState({ start: '', end: '' })
  const pickerRef = useRef<HTMLDivElement>(null)
  const siteRef = useRef<HTMLDivElement>(null)
  const pickerBtnRef = useRef<HTMLButtonElement>(null)
  const [detail, setDetail] = useState<'stations' | 'connectors' | 'errors' | 'perf' | null>(null)
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
  useEffect(() => {
    try { setCollapsed(localStorage.getItem('eves.sidebar') === '1') } catch {}
  }, [])
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 820px)')
    const sync = () => { setMobile(mql.matches); if (!mql.matches) setNavOpen(false) }
    sync()
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])
  useEffect(() => {
    if (!navOpen) return
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') setNavOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])
  const toggleSidebar = () => {
    if (mobile) { setNavOpen((o) => !o); return }
    setCollapsed((c) => {
      try { localStorage.setItem('eves.sidebar', c ? '0' : '1') } catch {}
      return !c
    })
  }
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
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const last = mountedAt - staleForMs
  // A feed that says live but has not updated for 2 minutes is not live.
  const pill: FeedStatus = status === 'live' && now - last > 120_000 ? 'stale' : status
  const slot = (k: Slot): SlotState => (status === 'loading' ? 'loading' : missing[k] ? 'missing' : 'ok')
  const selectedSet = useMemo(() => new Set(selectedSites), [selectedSites])
  const view = useMemo(() => siteView(selectedSet), [selectedSet])
  const { stations, connectors, connectorTotal, connectorTypes, live, errors, shown } = view
  const allSites = selectedSites.length === SITES.length
  const siteLabel = allSites ? `All sites · ${SITES.length} selected` : selectedSites.length === 1 ? (SITES.find((x) => x.id === selectedSites[0])?.name ?? '1 site') : `${selectedSites.length} of ${SITES.length} sites`
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
  const m = range.metrics[metric]
  const onlinePct = stations.total ? (stations.communication.online / stations.total) * 100 : 0

  const offlinePct = stations.total ? Math.round((stations.communication.offline / stations.total) * 100) : 0
  const availPct = connectorTotal ? (connectors.available / connectorTotal) * 100 : 0

  return (
    <div className={`${styles.page} ${bricolage.variable}`}>
      <div className={collapsed ? styles.frameCollapsed : styles.frame}>
        {mobile && navOpen && <div className={styles.navScrim} onClick={() => setNavOpen(false)} />}
        <aside id="primary-nav" className={`${collapsed && !mobile ? styles.sidebarCollapsed : styles.sidebar} ${navOpen ? styles.drawerOpen : ''}`}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>
              <Zap size={16} strokeWidth={2.4} />
            </span>
            <span className={styles.brandName}>EVES</span>
          </div>

          <nav className={styles.nav} aria-label="Primary">
            {NAV.map(({ label, icon: Icon, active }) => (
              !active ? (
                <span key={label} className={`${styles.navItem} ${styles.navSoon}`} aria-disabled="true" title={`${label} · coming soon`}>
                  <Icon size={16} strokeWidth={1.8} />
                  <span>{label}</span>
                </span>
              ) : <a key={label} href="#" onClick={(e) => { e.preventDefault(); setNavOpen(false) }} aria-current={active ? 'page' : undefined} title={label} aria-label={label} className={active ? styles.navItemActive : styles.navItem}>
                <Icon size={16} strokeWidth={1.8} />
                <span>{label}</span>
              </a>
            ))}
          </nav>
        </aside>

        <div className={styles.mainCol}>
          <header className={styles.topbar}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleSidebar}
              aria-label={(mobile ? navOpen : !collapsed) ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={mobile ? navOpen : !collapsed}
              aria-controls="primary-nav"
            >
              <PanelLeft size={16} strokeWidth={1.8} />
            </button>
            <span className={styles.topDivider} />
            <nav aria-label="Breadcrumb">
              <ol className={styles.crumbs}>
                <li><a href="#" onClick={(e) => e.preventDefault()} className={styles.crumbLink}>Operational &amp; monitoring</a></li>
                <li aria-hidden className={styles.crumbSep}>/</li>
                <li aria-current="page" className={styles.crumbCurrent}>Dashboard</li>
              </ol>
            </nav>
            <span className={styles.topUser}>
              <span className={styles.avatar}>J</span>
              <span className={styles.userName}>Jay</span>
            </span>
          </header>
        <main className={styles.main}>
          <header className={styles.header}>
            <div>
              <h1 className={styles.title}>Overview</h1>
              <div className={styles.sitePick} ref={siteRef}>
                <button type="button" className={styles.siteBtn} aria-haspopup="dialog" aria-expanded={siteOpen} onClick={() => setSiteOpen((v) => !v)}>
                  <Building2 size={14} strokeWidth={1.9} />
                  {siteLabel}
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
                <span className={styles[`feed_${pill}`]} role="status" title="Cards above are live and ignore the period">
                  <i />
                  {FEED_LABEL[pill]}
                  {pill !== 'loading' && <small> · updated {ago(now - last)}</small>}
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
                  ? "Can't reach the data feed. Numbers below are from the last update and may be out of date."
                  : 'Live updates are delayed. Numbers may be a few minutes behind.'}
              </span>
              <button type="button" className={styles.bannerBtn} onClick={onRetry ?? (() => window.location.reload())}>Retry</button>
            </div>
          )}

          {(stations.communication.offline > 0 || errors.length > 0) && (
            <div className={styles.attention} role="status">
              <TriangleAlert size={16} strokeWidth={1.9} />
              <span>
                <b>{stations.communication.offline} of {stations.total}</b> stations offline
                {errors.length > 0 && <> · <b>{errors.length}</b> recent {errors.length === 1 ? 'error' : 'errors'}</>}
              </span>
              {errors.length > 0 && (
                <button type="button" className={styles.link} onClick={() => document.getElementById('err-h')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>See errors</button>
              )}
            </div>
          )}

          {/* Zone 1: what is happening now. Never affected by the period. */}
          <section className={styles.zone} aria-labelledby="now-h">
            <h2 id="now-h" className={styles.srOnly}>Right now</h2>
            <div className={styles.rowNow}>
              <div className={`${styles.tileCard} ${styles.clickable} ${styles.toneStations}`}>
                <button type="button" className={styles.cardHit} aria-label="Open charging stations details" aria-haspopup="dialog" onClick={() => setDetail('stations')} />
                <span className={styles.cardHead}>
                  <span className={styles.kpiHead}>
                    <span className={styles.iconTile}><Radio size={15} strokeWidth={1.9} /></span>
                    <h3 className={styles.kpiLabel}>Charging stations</h3>
                  </span>
                  <span className={styles.headRight}><span className={styles.total}>{stations.total} total</span><DetailBtn label="Open charging stations details" onOpen={() => setDetail('stations')} /></span>
                </span>
                <Gate s={slot('stations')} kind="body">
                  <div className={styles.tileBody}>
                    <Ring value={stations.communication.offline} total={stations.total} base="var(--good)" arc="var(--offline)" label={`${offlinePct}%`} sub="offline" caption={`${stations.communication.online} online, ${stations.communication.offline} offline`} />
                    <ul className={styles.legend}>
                      <li><span className={styles.dotOff} />Offline<b>{stations.communication.offline}</b></li>
                      <li><span className={styles.dotOn} />Online<b>{stations.communication.online}</b></li>
                    </ul>
                  </div>
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
                    <span className={styles.iconTile}><Plug size={15} strokeWidth={1.9} /></span>
                    <h3 className={styles.kpiLabel}>Connectors</h3>
                  </span>
                  <span className={styles.headRight}><span className={styles.total}>{connectorTotal} total</span><DetailBtn label="Open connectors details" onOpen={() => setDetail('connectors')} /></span>
                </span>
                <Gate s={slot('connectors')} kind="body">
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
                    <span className={styles.iconTile}><Layers size={15} strokeWidth={1.9} /></span>
                    <h3 className={styles.kpiLabel}>Connector types</h3>
                  </span>
                  <span className={styles.headRight}><span className={styles.total}>{connectorTypes.length} types</span><DetailBtn label="Open connector types details" onOpen={() => setDetail('connectors')} /></span>
                </span>
                <Gate s={slot('types')} kind="body">
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
                    <span className={styles.iconTile}><Activity size={15} strokeWidth={1.9} /></span>
                    <h3 className={styles.kpiLabel}>Sessions</h3>
                  </span>
                </span>
                <Gate s={slot('sessions')} kind="body" emptyTitle="No data reported">
                  <div className={styles.bigStats}>
                    <div>
                      <span className={styles.bigNum}>{live.activeSessions}</span>
                      <span className={styles.bigLabel}>Active session</span>
                    </div>
                    <div>
                      <span className={shown.sessionErrors > 0 ? styles.bigNum : styles.bigNumZero}>{shown.sessionErrors}</span>
                      <span className={styles.bigLabel}>{shown.sessionErrors > 0 && <i className={styles.errDot} aria-hidden />}Session error</span>
                    </div>
                  </div>
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
                          <label className={styles.dateField}>
                            Start
                            <input type="date" min={minDate} max={maxDate} value={draft.start} onChange={(e) => setDraft((d) => ({ ...d, start: e.target.value }))} />
                          </label>
                          <label className={styles.dateField}>
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
                  >
                    {o}
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
                <Gate s={perfSlot('trend')} kind="body">
                  {(() => {
                    const ins = rangeInsights(range, metric)
                    if (!ins) return null
                    return (
                      <ul key={`${range.key}-${metric}`} className={styles.insights} style={MCOLOR[metric] as CSSProperties}>
                        <li><span>{range.bestLabel}</span><b>{ins.best.label} · {ins.fmt(ins.best.value)}</b></li>
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

          <section className={styles.zone} aria-labelledby="err-h">
            <div className={styles.zoneHead}>
              <div className={styles.zoneTitleGroup}>
                <h2 id="err-h" className={styles.zoneTitle}>Errors</h2>
                <button type="button" className={styles.link} onClick={() => setDetail('errors')} aria-haspopup="dialog">View all errors</button>
              </div>
            </div>
        <div className={`${styles.tileCard} ${styles.clickable} ${styles.errCard}`}>
                <button type="button" className={styles.cardHit} aria-label="Open errors details" aria-haspopup="dialog" onClick={() => setDetail('errors')} />
          <Gate s={slot('errors')} kind="body">
            <div className={styles.tileBody}>
              <div className={styles.tileStat}>
                <span className={styles.heroValue}>{errors.length}<small> recent</small></span>
              </div>
              {errors.length > 0 && (
                <div className={styles.errGroup}>
                  <span>{errors[0]?.type}</span>
                </div>
              )}
            </div>
            {errors.length === 0 && <p className={styles.inlineNote}>No errors reported. All clear.</p>}
            {errors.length > 0 && (
              <>
                <div className={styles.errRail}>
                  {(() => {
                    const ts = errors.map((y) => new Date(y.iso).getTime())
                    const lo = Math.min(...ts)
                    const hi = Math.max(...ts)
                    return errors.map((x) => {
                      const pos = hi === lo ? 50 : ((new Date(x.iso).getTime() - lo) / (hi - lo)) * 100
                      return (
                        <span key={x.id} className={styles.errPoint} style={{ left: `${pos}%`, transform: `translateX(-${pos}%)` }}>
                          <i aria-hidden />
                          <time dateTime={x.iso}>{x.relative}</time>
                        </span>
                      )
                    })
                  })()}
                </div>
              </>
            )}
          </Gate>
        </div>
          </section>
        </main>
        </div>
      </div>

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
                <Gate s={slot('stations')} kind="body">
                  <p className={styles.heroValue}>{stations.communication.offline}<small> of {stations.total} offline · {offlinePct}%</small></p>
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
                <Gate s={slot('connectors')} kind="body">
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
                  <p className={styles.inlineNote}>{live.activeSessions} active · {shown.sessionErrors} session errors</p>
                  <h4 className={styles.subHead}>By type</h4>
                  <Gate s={slot('types')} kind="body">
                    <ul className={styles.types}>
                      {[...connectorTypes].sort((a, b) => b.count - a.count).map((x) => (
                        <li key={x.name}><span className={styles.typeName}><ConnectorIcon type={x.name} size={14} /> {x.name}</span><b>{x.count}</b></li>
                      ))}
                    </ul>
                  </Gate>
                </Gate>
              )}
              {detail === 'errors' && (
                <Gate s={slot('errors')} kind="body">
                  <p className={styles.heroValue}>{errors.length}<small> recent</small></p>
                  {errors.length === 0 ? (
                    <p className={styles.inlineNote}>No errors reported. All clear.</p>
                  ) : (
                    <ul className={styles.types}>
                      {errors.map((x) => (
                        <li key={x.id}>
                          <span className={styles.typeName}>{x.type}</span>
                          <time dateTime={x.iso}>{x.absolute}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </Gate>
              )}
              {detail === 'perf' && (
                <Gate s={slot('trend')} kind="body">
                  <p className={styles.chartNote}>{m.label} by {range.tableNoun}.{range.hasPartial ? (range.unit === 'week' ? ' The oldest week is partial.' : ' Partial months are marked.') : ''}</p>
                  <ul className={styles.types}>
                    {m.series.map((p) => (
                      <li key={p.key}>
                        <span className={styles.typeName}>{p.full}</span>
                        <b>{m.fmt(p.value)}</b>
                      </li>
                    ))}
                  </ul>
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
