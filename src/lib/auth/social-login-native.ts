import { Capacitor } from '@capacitor/core'
import { SocialLogin } from '@capgo/capacitor-social-login'
import { isNativePlatform } from '../platform/capacitor'
import { supabase } from '../supabase'

function googleWebClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
}

function googleIosClientId(): string {
  return import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || ''
}

let initPromise: Promise<void> | null = null

export function initializeNativeSocialLogin(): Promise<void> {
  if (!isNativePlatform()) return Promise.resolve()

  if (initPromise) return initPromise

  initPromise = (async () => {
    const webClientId = googleWebClientId()
    const iOSClientId = googleIosClientId()

    if (!webClientId) {
      throw new Error('VITE_GOOGLE_CLIENT_ID is required for native Google sign-in.')
    }
    if (Capacitor.getPlatform() === 'ios' && !iOSClientId) {
      throw new Error('VITE_GOOGLE_IOS_CLIENT_ID is required for iOS Google sign-in.')
    }

    await SocialLogin.initialize({
      google: {
        webClientId,
        iOSClientId: iOSClientId || undefined,
        iOSServerClientId: webClientId,
        mode: 'online',
      },
    })
  })().catch((err) => {
    initPromise = null
    throw err
  })

  return initPromise
}

function isGoogleOnlineResult(
  result: Awaited<ReturnType<typeof SocialLogin.login>>['result'],
): result is Extract<
  Awaited<ReturnType<typeof SocialLogin.login>>['result'],
  { responseType: 'online' }
> {
  return 'responseType' in result && result.responseType === 'online'
}

export async function signInWithGoogleNative(): Promise<{ error: Error | null }> {
  await initializeNativeSocialLogin()

  // Do not pass nonce: native Google SDK embeds its own; Supabase "Skip nonce check"
  // must be enabled. Sending a client nonce causes "Nonces mismatch".
  const login = await SocialLogin.login({
    provider: 'google',
    options: {},
  })

  if (login.provider !== 'google' || !isGoogleOnlineResult(login.result)) {
    return { error: new Error('Unexpected Google sign-in response.') }
  }

  const idToken = login.result.idToken
  if (!idToken) {
    return { error: new Error('Google ID token missing.') }
  }

  const { error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  })

  return { error: error ? new Error(error.message) : null }
}

export async function signOutGoogleNative(): Promise<void> {
  if (!isNativePlatform()) return
  try {
    await initializeNativeSocialLogin()
    await SocialLogin.logout({ provider: 'google' })
  } catch {
    // Supabase session is cleared regardless; ignore native logout failures.
  }
}
