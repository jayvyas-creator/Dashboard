// Fixtures for the EVES dashboard concepts. Headline values are the ones shown
// in the current dashboard screenshots. Monthly series values are read off the
// bar charts by eye (approximate) and the trend shapes are illustrative —
// the real series definitions are still an open question (see the audit).

export const SITES_SELECTED = 23

export const PERIOD = {
  label: '6 months',
  range: '05/21/2026 – 11/21/2026',
  options: ['6 months', '30 days', '7 days', '24 hours'],
}

export const stations = {
  total: 49,
  category: { public: 36, private: 13 },
  communication: { online: 15, offline: 34 },
  newCharger: { pending: 8, comingSoon: 0 },
}

export const connectors = {
  available: 17,
  unavailable: 47,
  occupied: 0,
  reserved: 0,
  faulted: 0,
}

export const connectorTotal = 64

export const connectorTypes = [
  { name: 'Type 2', count: 11 },
  { name: 'CHAdeMO', count: 4 },
  { name: 'Type 1', count: 27 },
  { name: 'CCS Type 1', count: 21 },
  { name: 'NACS', count: 1 },
]

export const live = { activeSessions: 1, sessionErrors: 0 }

export const totals = {
  sessions: 1881,
  avgCost: 10.03,
  avgDurationMin: 131.87,
  fees: 22375.79,
  transactions: 1141,
  energyKwh: 34751.0022,
  avgEnergyKwh: 18.4747,
}

export interface MonthPoint {
  month: string
  value: number
  /** First and last buckets only cover part of a calendar month for this range. */
  partial?: boolean
  covers?: string
}

const cover = (m: string) =>
  m === 'May' ? 'May 21–31' : m === 'Nov' ? 'Nov 1–21' : undefined
const build = (vals: number[]): MonthPoint[] =>
  ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'].map((month, i) => ({
    month: `${month}-2026`,
    value: vals[i],
    partial: month === 'May' || month === 'Nov',
    covers: cover(month),
  }))

export const sessionsByMonth = build([140, 310, 390, 425, 225, 275, 110])
export const feesByMonth = build([1500, 3250, 3150, 4400, 3950, 4450, 1500])
export const energyByMonth = build([1800, 6050, 6000, 6450, 5500, 6050, 2800])

// Illustrative trend shapes (transactions, avg energy per session).
export const transactionsTrend = [
  2, 3, 2, 4, 5, 4, 3, 5, 6, 5, 7, 8, 7, 6, 8, 9, 8, 10, 11, 10, 12, 13, 12, 14, 15, 17, 18, 19,
].map((v, i) => ({ i, v }))
export const avgEnergyTrend = [
  3, 4, 4, 5, 4, 5, 6, 6, 5, 6, 7, 7, 8, 7, 8, 9, 9, 8, 9, 10, 11, 10, 10, 11, 12, 13, 13, 14,
].map((v, i) => ({ i, v }))

export interface ErrorEntry {
  id: string
  type: string
  iso: string
  relative: string
  absolute: string
}

// Newest first.
export const errors: ErrorEntry[] = [
  { id: 'e4', type: 'OcppStatusNotification', iso: '2026-11-21T05:17:56', relative: 'Today, 5:17 AM', absolute: 'November 21, 2026, 05:17:56 AM' },
  { id: 'e3', type: 'OcppStatusNotification', iso: '2026-11-21T02:44:08', relative: 'Today, 2:44 AM', absolute: 'November 21, 2026, 02:44:08 AM' },
  { id: 'e2', type: 'OcppStatusNotification', iso: '2026-11-21T00:17:22', relative: 'Today, 12:17 AM', absolute: 'November 21, 2026, 12:17:22 AM' },
  { id: 'e1', type: 'OcppStatusNotification', iso: '2026-11-20T11:58:07', relative: 'Yesterday, 11:58 AM', absolute: 'November 20, 2026, 11:58:07 AM' },
]

export interface MapPin {
  id: string
  x: number
  y: number
  status: 'online' | 'offline'
}

// Illustrative placement around Los Angeles — not real coordinates.
export const mapPins: MapPin[] = [
  { id: 'p1', x: 150, y: 120, status: 'online' },
  { id: 'p2', x: 188, y: 108, status: 'online' },
  { id: 'p3', x: 330, y: 255, status: 'online' },
  { id: 'p4', x: 352, y: 262, status: 'offline' },
  { id: 'p5', x: 520, y: 150, status: 'offline' },
  { id: 'p6', x: 560, y: 215, status: 'offline' },
  { id: 'p7', x: 610, y: 300, status: 'offline' },
  { id: 'p8', x: 455, y: 320, status: 'offline' },
  { id: 'p9', x: 690, y: 190, status: 'offline' },
  { id: 'p10', x: 250, y: 330, status: 'offline' },
  { id: 'p11', x: 400, y: 90, status: 'offline' },
  { id: 'p12', x: 700, y: 310, status: 'offline' },
]
