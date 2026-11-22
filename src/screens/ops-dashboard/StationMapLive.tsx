'use client'

import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'
import { mapPins } from '@/components/dashboard/data'
import styles from './OpsDashboard.module.css'

// The sample pins are drawn on an 800x400 plane; place that plane over Greater Los Angeles.
const toLngLat = (x: number, y: number): [number, number] => [-118.75 + (x / 800) * 1.0, 34.3 - (y / 400) * 0.65]

const CHECK = '<svg width="14" height="14" viewBox="-7 -7 14 14"><path d="M-3.5 0.5 L-1 3 L4 -2.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
const BAR = '<svg width="14" height="14" viewBox="-7 -7 14 14"><path d="M-4 0 L4 0" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>'

// The worker is served from /public so the bundler does not have to resolve it.
maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs')

export default function StationMapLive() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const map = new maplibregl.Map({
      container: ref.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      attributionControl: { compact: true },
      scrollZoom: false,
    })
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left')

    const bounds = new maplibregl.LngLatBounds()
    mapPins.forEach((p) => {
      const pos = toLngLat(p.x, p.y)
      bounds.extend(pos)
      const online = p.status === 'online'
      const el = document.createElement('div')
      el.className = online ? `${styles.pin} ${styles.pinOn}` : `${styles.pin} ${styles.pinOff}`
      el.innerHTML = online ? CHECK : BAR
      el.title = online ? 'Online station' : 'Offline station'
      new maplibregl.Marker({ element: el }).setLngLat(pos).addTo(map)
    })
    map.fitBounds(bounds, { padding: 56, animate: false, maxZoom: 11 })

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(ref.current)
    return () => {
      ro.disconnect()
      map.remove()
    }
  }, [])

  return <div ref={ref} className={styles.leaflet} role="region" aria-label="Map of station locations, online or offline" />
}
