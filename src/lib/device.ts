export const haptic = {
  tap: () => navigator.vibrate?.(8),
  success: () => navigator.vibrate?.([14, 70, 28]),
  error: () => navigator.vibrate?.([30, 50, 30]),
}

export async function compressImage(file: File, max = 1080, quality = 0.74): Promise<string> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.round(bmp.width * scale)
  const h = Math.round(bmp.height * scale)
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  bmp.close?.()
  return c.toDataURL('image/jpeg', quality)
}

let swReg: ServiceWorkerRegistration | null = null

export async function registerSW() {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return
  try {
    swReg = await navigator.serviceWorker.register('./sw.js')
  } catch {
    /* offline cache is a nice-to-have */
  }
}

export const notifySupported = () => 'Notification' in window

export async function askNotifyPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notifySupported()) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  return Notification.requestPermission()
}

export async function systemNotify(title: string, body: string, hash?: string) {
  if (!notifySupported() || Notification.permission !== 'granted') return
  const url = hash ? `${location.origin}${location.pathname}#${hash}` : undefined
  const opts: NotificationOptions = { body, icon: './icons/icon-192.png', badge: './icons/icon-192.png', data: { url } }
  try {
    const reg = swReg ?? (await navigator.serviceWorker?.getRegistration())
    if (reg) await reg.showNotification(title, opts)
    else new Notification(title, opts)
  } catch {
    /* some browsers block constructor-based notifications */
  }
}

type WakeLockNav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }

export async function keepAwake() {
  try {
    const lock = await (navigator as WakeLockNav).wakeLock?.request('screen')
    return () => {
      lock?.release()
    }
  } catch {
    return () => {}
  }
}
