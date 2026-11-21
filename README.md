# EVES ops dashboard

EV-charging operations dashboard: live overview cards (stations, connectors, connector types, sessions), a Performance chart (6 months, 30 days, 7 days, 24 hours), and recent errors. Click a card for its detail drawer.

```bash
npm install
npm run dev
```

## Data

- `src/components/dashboard/data.ts` is the feed snapshot for the 6-month range.
- The 30-day, 7-day and 24-hour ranges (`src/screens/ops-dashboard/ranges.ts`) and the non-zero Occupied, Reserved, Faulted, Coming soon and Session error values (`sample.ts`) are illustrative sample data. Replace them with real feed data before shipping.

## Status

Responsive breakpoints exist (4 → 2 → 1 columns, collapsed sidebar), but they have only been checked at desktop width (1440px).
