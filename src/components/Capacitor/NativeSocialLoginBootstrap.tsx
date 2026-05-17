import { useEffect } from 'react'
import { isNativePlatform } from '../../lib/platform/capacitor'
import { initializeNativeSocialLogin } from '../../lib/auth/social-login-native'

export function NativeSocialLoginBootstrap() {
  useEffect(() => {
    if (!isNativePlatform()) return
    void initializeNativeSocialLogin().catch((err) => {
      console.warn('Native social login init failed:', err)
    })
  }, [])

  return null
}
