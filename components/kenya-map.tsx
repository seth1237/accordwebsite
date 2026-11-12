'use client'

import { useEffect, useRef, useState } from 'react'
import { kenyaCountiesGeoJson } from '@/lib/kenya-counties'
import type { CountyTotals } from '@/lib/kenya-analytics'

export type MapMetric = 'visitors' | 'sessions' | 'pageViews' | 'returningVisitors' | 'productViews' | 'engagementRate'

const KENYA_CENTER: [number, number] = [0.23, 37.9]

function shade(value: number, max: number) {
  if (!value || !max) return '#d5e0de'
  const t = Math.max(0.12, Math.min(1, value / max))
  const mix = (from: number, to: number) => Math.round(from + (to - from) * t)
  return `rgb(${mix(214, 8)}, ${mix(232, 95)}, ${mix(228, 117)})`
}

function loadLeaflet(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).L) {
      resolve((window as any).L)
      return
    }
    if (!document.querySelector('link[data-leaflet]')) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      css.setAttribute('data-leaflet', '1')
      document.head.appendChild(css)
    }
    const existing = document.querySelector('script[data-leaflet]') as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).L))
      existing.addEventListener('error', () => reject(new Error('Leaflet failed')))
      return
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.setAttribute('data-leaflet', '1')
    script.onload = () => resolve((window as any).L)
    script.onerror = () => reject(new Error('Leaflet failed'))
    document.body.appendChild(script)
  })
}

export function KenyaMap({
  counties,
  metric,
  selected,
  onSelect,
  onReset,
}: {
  counties: CountyTotals[]
  metric: MapMetric
  selected: string
  onSelect: (code: string) => void
  onReset: () => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)
  const selectRef = useRef(onSelect)
  const [ready, setReady] = useState(0)
  selectRef.current = onSelect

  useEffect(() => {
    let cancelled = false
    void loadLeaflet().then((L) => {
      if (cancelled || !host.current || mapRef.current) return
      const map = L.map(host.current, {
        scrollWheelZoom: true,
        attributionControl: false,
        minZoom: 5,
        maxZoom: 10,
      })
      map.setView(KENYA_CENTER, 6)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 10 }).addTo(map)
      mapRef.current = map
      window.setTimeout(() => map.invalidateSize(), 80)
      setReady((value) => value + 1)
    })
    return () => {
      cancelled = true
      mapRef.current?.remove()
      mapRef.current = null
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const L = typeof window !== 'undefined' ? (window as any).L : null
    if (!map || !L) return
    const byCode = new Map(counties.map((county) => [county.code, county]))
    const max = Math.max(1, ...counties.map((county) => Number(county[metric]) || 0))
    let cancelled = false
    void fetch('/kenya-counties.geojson')
      .then((response) => (response.ok ? response.json() : kenyaCountiesGeoJson()))
      .catch(() => kenyaCountiesGeoJson())
      .then((geo) => {
        if (cancelled || !mapRef.current) return
        if (layerRef.current) {
          mapRef.current.removeLayer(layerRef.current)
          layerRef.current = null
        }
        const layer = L.geoJSON(geo, {
          style: (feature: { properties?: { code?: string } }) => {
            const code = String(feature?.properties?.code || feature?.properties?.CODE || '')
            const value = Number(byCode.get(String(code).padStart(2, '0'))?.[metric]) || 0
            return {
              color: selected === String(code).padStart(2, '0') ? '#123744' : '#f7fbfa',
              weight: selected === String(code).padStart(2, '0') ? 2.4 : 1,
              fillColor: shade(value, max),
              fillOpacity: 0.92,
            }
          },
          onEachFeature: (feature: { properties?: { code?: string; name?: string; NAME?: string } }, featureLayer: any) => {
            const code = String(feature?.properties?.code || '').padStart(2, '0')
            const name = String(feature?.properties?.name || feature?.properties?.NAME || code)
            const value = Number(byCode.get(code)?.[metric]) || 0
            featureLayer.bindTooltip(`<strong>${name}</strong><br>${value.toLocaleString('en-KE')} ${metricLabel(metric)}`)
            featureLayer.on('click', () => selectRef.current(code))
          },
        }).addTo(mapRef.current)
        layerRef.current = layer
      })
    return () => {
      cancelled = true
    }
  }, [counties, metric, selected, ready])

  return (
    <div className="kenya-map-wrap">
      <div ref={host} className="kenya-map" role="img" aria-label="Kenya county visitor map" />
      <div className="kenya-map-tools">
        <button type="button" className="kenya-reset" onClick={() => {
          mapRef.current?.setView(KENYA_CENTER, 6)
          onReset()
        }}>Reset Kenya view</button>
        <div className="kenya-legend" aria-hidden="true">
          <span>No data</span>
          <i /><i /><i /><i />
          <span>Higher</span>
        </div>
      </div>
    </div>
  )
}

export function metricLabel(metric: MapMetric) {
  if (metric === 'sessions') return 'sessions'
  if (metric === 'pageViews') return 'page views'
  if (metric === 'returningVisitors') return 'returning visitors'
  if (metric === 'productViews') return 'product views'
  if (metric === 'engagementRate') return 'engagement %'
  return 'visitors'
}
