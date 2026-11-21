export const int = (n: number) => n.toLocaleString('en-US')

export const usd = (n: number) =>
  '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const kwh = (n: number, digits = 1) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** 131.87 -> "2 h 12 min" (the exact figure stays available as a secondary label). */
export const duration = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h} h ${m} min` : `${m} min`
}

export const share = (part: number, whole: number) => `${Math.round((part / whole) * 100)}%`
