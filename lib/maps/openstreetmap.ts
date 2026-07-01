/** Load Leaflet + OpenStreetMap tiles (no API key required) */

type LeafletModule = {
  map: (el: HTMLElement) => LeafletMap
  tileLayer: (url: string, opts: Record<string, unknown>) => { addTo: (map: LeafletMap) => void }
  marker: (latlng: [number, number], opts?: { draggable?: boolean }) => LeafletMarker
}

type LeafletMap = {
  setView: (latlng: [number, number], zoom: number) => LeafletMap
  on: (event: string, handler: (e: { latlng: { lat: number; lng: number } }) => void) => void
  invalidateSize: () => void
}

type LeafletMarker = {
  addTo: (map: LeafletMap) => LeafletMarker
  setLatLng: (latlng: [number, number]) => void
  getLatLng: () => { lat: number; lng: number }
  on: (event: string, handler: () => void) => void
}

let leafletPromise: Promise<LeafletModule> | null = null

export function loadLeaflet(): Promise<LeafletModule> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (leafletPromise) return leafletPromise

  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.dataset.leafletCss = 'true'
      document.head.appendChild(link)
    }

    const win = window as Window & { L?: LeafletModule }
    if (win.L) {
      resolve(win.L)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.async = true
    script.dataset.leaflet = 'true'
    script.onload = () => {
      if (win.L) resolve(win.L)
      else reject(new Error('Leaflet failed to load'))
    }
    script.onerror = () => reject(new Error('Leaflet failed to load'))
    document.head.appendChild(script)
  })

  return leafletPromise
}

export async function nominatimSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = (await res.json()) as { lat: string; lon: string }[]
  if (!data[0]) return null
  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
}

export async function nominatimReverse(lat: number, lng: number): Promise<{
  address: string
  city: string
  country: string
} | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return null
  const data = (await res.json()) as {
    display_name?: string
    address?: Record<string, string>
  }
  const addr = data.address ?? {}
  const city = addr.city || addr.town || addr.village || addr.state || ''
  const country = addr.country_code?.toUpperCase() ?? ''
  const street = [addr.house_number, addr.road].filter(Boolean).join(' ')
  return {
    address: street || data.display_name?.split(',')[0]?.trim() || '',
    city,
    country,
  }
}

export type { LeafletMap, LeafletMarker, LeafletModule }
