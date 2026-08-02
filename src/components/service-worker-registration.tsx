'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] SW registered:', reg.scope)

          // Wait for the service worker to be active
          if (reg.installing) {
            reg.installing.addEventListener('statechange', () => {
              if (reg.installing?.state === 'activated') {
                console.log('[PWA] SW activated')
                window.dispatchEvent(new Event('swactivated'))
              }
            })
          } else if (reg.active) {
            console.log('[PWA] SW already active')
            window.dispatchEvent(new Event('swactivated'))
          }

          // Check for updates periodically
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'activated') {
                  console.log('[PWA] New SW activated')
                  window.dispatchEvent(new Event('swactivated'))
                }
              })
            }
          })
        })
        .catch((err) => console.warn('[PWA] SW registration failed:', err))
    }

    if (document.readyState === 'complete') {
      registerSW()
    } else {
      window.addEventListener('load', registerSW)
    }
  }, [])

  return null
}
