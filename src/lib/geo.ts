export interface Fix {
  lat: number
  lng: number
  acc: number
  at: number
}

export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

export type GeoError = 'denied' | 'unavailable' | 'timeout' | 'unsupported'

const toFix = (p: GeolocationPosition): Fix => ({
  lat: p.coords.latitude,
  lng: p.coords.longitude,
  acc: p.coords.accuracy,
  at: p.timestamp,
})
const toErr = (e: GeolocationPositionError): GeoError => (e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable')

export function getFix(timeout = 12000): Promise<Fix> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject('unsupported')
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(toFix(p)),
      (e) => reject(toErr(e)),
      { enableHighAccuracy: true, timeout, maximumAge: 20000 },
    )
  })
}

export function watchFix(onFix: (f: Fix) => void, onErr: (e: GeoError) => void) {
  if (!('geolocation' in navigator)) {
    onErr('unsupported')
    return () => {}
  }
  const id = navigator.geolocation.watchPosition(
    (p) => onFix(toFix(p)),
    (e) => onErr(toErr(e)),
    { enableHighAccuracy: true, maximumAge: 10000 },
  )
  return () => navigator.geolocation.clearWatch(id)
}

/** Students must be within this radius of the supervisor's phone, plus GPS slack. */
export const RADIUS_M = 150
export const allowedRadius = (supAcc = 0, stuAcc = 0) => RADIUS_M + Math.min(100, supAcc) + Math.min(100, stuAcc)
