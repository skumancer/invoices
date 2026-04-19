import { useEffect, useState } from 'react'
import { Network } from '@capacitor/network'
import { isNativePlatform } from '../lib/platform/capacitor'

export function useNetworkStatus() {
  const [connected, setConnected] = useState<boolean>(true)

  useEffect(() => {
    let removeListener: (() => void) | null = null

    if (isNativePlatform()) {
      Network.getStatus()
        .then((status) => setConnected(status.connected))
        .catch(() => setConnected(true))

      Network.addListener('networkStatusChange', (status) => {
        setConnected(status.connected)
      }).then((handle) => {
        removeListener = () => {
          void handle.remove()
        }
      })
    } else {
      const onOnline = () => setConnected(true)
      const onOffline = () => setConnected(false)
      window.addEventListener('online', onOnline)
      window.addEventListener('offline', onOffline)
      removeListener = () => {
        window.removeEventListener('online', onOnline)
        window.removeEventListener('offline', onOffline)
      }
    }

    return () => {
      if (removeListener) removeListener()
    }
  }, [])

  return { connected }
}
