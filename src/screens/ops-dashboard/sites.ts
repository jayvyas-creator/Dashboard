import { connectorTypes, connectors, errors, live, stations } from '@/components/dashboard/data'
import { shown } from './sample'

/**
 * ILLUSTRATIVE SAMPLE sites. The feed reports totals only, with no site list.
 * Every total in data.ts is split across these sites with fixed weights, so the sites always add up
 * to the real totals and "All sites" shows exactly what the feed reports. Delete this file, and the
 * site filter in OpsDashboard.tsx, once the feed reports sites. data.ts stays untouched.
 */

export interface Site {
  id: string
  name: string
  /** Relative size, used to split the totals. */
  weight: number
}

const RAW: [string, number][] = [
  ['Airport Long-Term', 5], ['Airport Terminal B', 3], ['Central Station', 4], ['City Hall', 2],
  ['Downtown Garage', 6], ['Eastside Mall', 4], ['Fleet Yard', 3], ['Harbor Point', 2],
  ['Hospital North', 3], ['Hotel Meridian', 2], ['Library Square', 1], ['Logistics Depot', 5],
  ['Marina Lot', 1], ['Museum Quarter', 2], ['Office Park West', 4], ['Park & Ride North', 2],
  ['Park & Ride South', 2], ['Retail Park', 3], ['Riverside Plaza', 3], ['Stadium South', 3],
  ['Tech Campus', 5], ['Town Centre', 3], ['University East', 4],
]

export const SITES: Site[] = RAW.map(([name, weight], i) => ({ id: `s${i + 1}`, name, weight }))

/** Split `total` into whole numbers in proportion to `weights`. The parts always add up to `total`. */
function allocate(total: number, weights: number[]): number[] {
  const sumW = weights.reduce((a, b) => a + b, 0)
  if (total <= 0 || sumW <= 0) return weights.map(() => 0)
  const exact = weights.map((w) => (total * w) / sumW)
  const out = exact.map(Math.floor)
  let left = total - out.reduce((a, b) => a + b, 0)
  exact
    .map((x, i) => ({ i, r: x - Math.floor(x) }))
    .sort((a, b) => b.r - a.r || a.i - b.i)
    .forEach(({ i }) => {
      if (left > 0) { out[i]! += 1; left -= 1 }
    })
  return out
}

/** Like allocate, but gives every site at least one when there are enough to go round. */
const allocateMin1 = (total: number, weights: number[]) =>
  total >= weights.length ? allocate(total - weights.length, weights).map((n) => n + 1) : allocate(total, weights)

const W = SITES.map((s) => s.weight)
const stationsPer = allocateMin1(stations.total, W)
const connectorsPer = allocateMin1(connectors.available + connectors.unavailable, stationsPer)
const publicPer = allocate(stations.category.public, stationsPer)
const onlinePer = allocate(stations.communication.online, stationsPer)
const pendingPer = allocate(stations.newCharger.pending, stationsPer)
const comingPer = allocate(shown.comingSoon, stationsPer)
const availablePer = allocate(connectors.available, connectorsPer)
const occupiedPer = allocate(shown.occupied, connectorsPer)
const reservedPer = allocate(shown.reserved, connectorsPer)
const faultedPer = allocate(shown.faulted, connectorsPer)
const activePer = allocate(live.activeSessions, W)
const sessErrPer = allocate(shown.sessionErrors, W)

// Connector types: shuffle one token per connector, then deal them out, so both the per-site
// connector counts and the per-type totals come out exact.
const tokens = connectorTypes.flatMap((t) => Array<string>(t.count).fill(t.name))
let seed = 7
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)
for (let i = tokens.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1))
  ;[tokens[i], tokens[j]] = [tokens[j]!, tokens[i]!]
}
let cursor = 0
const typesPer = connectorsPer.map((n) => {
  const counts: Record<string, number> = Object.fromEntries(connectorTypes.map((t) => [t.name, 0]))
  tokens.slice(cursor, cursor + n).forEach((t) => { counts[t]! += 1 })
  cursor += n
  return counts
})

const errorSite = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % SITES.length, 7)

export interface SiteView {
  stations: typeof stations
  connectors: typeof connectors
  connectorTotal: number
  connectorTypes: typeof connectorTypes
  live: typeof live
  errors: typeof errors
  shown: typeof shown
  /** Selected share of all connectors, used to scale the performance numbers. */
  share: number
}

const sumOf = (ids: number[], xs: number[]) => ids.reduce((t, i) => t + (xs[i] ?? 0), 0)

/** Every figure on the page for the selected sites. All sites selected gives the feed totals exactly. */
export function siteView(selected: ReadonlySet<string>): SiteView {
  const idx = SITES.map((s, i) => (selected.has(s.id) ? i : -1)).filter((i) => i >= 0)
  const st = sumOf(idx, stationsPer)
  const online = sumOf(idx, onlinePer)
  const cn = sumOf(idx, connectorsPer)
  const avail = sumOf(idx, availablePer)
  const sites = new Set(idx.map((i) => SITES[i]!.id))
  return {
    stations: {
      total: st,
      category: { public: sumOf(idx, publicPer), private: st - sumOf(idx, publicPer) },
      communication: { online, offline: st - online },
      newCharger: { pending: sumOf(idx, pendingPer), comingSoon: sumOf(idx, comingPer) },
    },
    connectors: {
      available: avail,
      unavailable: cn - avail,
      occupied: sumOf(idx, occupiedPer),
      reserved: sumOf(idx, reservedPer),
      faulted: sumOf(idx, faultedPer),
    },
    connectorTotal: cn,
    connectorTypes: connectorTypes.map((t) => ({ ...t, count: idx.reduce((n, i) => n + (typesPer[i]?.[t.name] ?? 0), 0) })),
    live: { activeSessions: sumOf(idx, activePer), sessionErrors: sumOf(idx, sessErrPer) },
    errors: errors.filter((e) => sites.has(SITES[errorSite(e.id)]!.id)),
    shown: {
      comingSoon: sumOf(idx, comingPer),
      occupied: sumOf(idx, occupiedPer),
      reserved: sumOf(idx, reservedPer),
      faulted: sumOf(idx, faultedPer),
      sessionErrors: sumOf(idx, sessErrPer),
    },
    share: cn / (connectors.available + connectors.unavailable || 1),
  }
}

/** Short facts for the site list: stations and connectors at each site. */
export const siteFacts = (id: string) => {
  const i = SITES.findIndex((s) => s.id === id)
  return { stations: stationsPer[i] ?? 0, connectors: connectorsPer[i] ?? 0 }
}
