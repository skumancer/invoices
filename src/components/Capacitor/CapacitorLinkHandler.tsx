import { useEffect } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { useNavigate } from 'react-router-dom'
import { isNativePlatform } from '../../lib/platform/capacitor'
import { getPathFromIncomingUrl } from '../../lib/platform/auth'

export function CapacitorLinkHandler() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!isNativePlatform()) return

    const listenerPromise = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      const path = getPathFromIncomingUrl(url)
      if (path) {
        void Browser.close()
        navigate(path, { replace: true })
      }
    })

    return () => {
      void listenerPromise.then((listener) => listener.remove())
    }
  }, [navigate])

  return null
}
