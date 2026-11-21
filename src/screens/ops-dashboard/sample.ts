import { connectors, live, stations } from '@/components/dashboard/data'

/**
 * ILLUSTRATIVE SAMPLE values for fields the feed reports as 0.
 * data.ts stays untouched. Each value falls back to the feed the moment it is non-zero,
 * so wiring in real data replaces the sample automatically. Delete this file once the feed fills them.
 */
const SAMPLE = { comingSoon: 3, occupied: 4, reserved: 2, faulted: 1, sessionErrors: 2 }

export const shown = {
  comingSoon: stations.newCharger.comingSoon || SAMPLE.comingSoon,
  occupied: connectors.occupied || SAMPLE.occupied,
  reserved: connectors.reserved || SAMPLE.reserved,
  faulted: connectors.faulted || SAMPLE.faulted,
  sessionErrors: live.sessionErrors || SAMPLE.sessionErrors,
}
