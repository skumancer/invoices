const GENERIC_ERROR = 'Something went wrong. Please try again.'

const SUPABASE_URL = typeof import.meta.env?.VITE_SUPABASE_URL === 'string' ? import.meta.env.VITE_SUPABASE_URL : ''

function isLocalSupabase(): boolean {
  if (!SUPABASE_URL) return false
  try {
    const u = new URL(SUPABASE_URL)
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost'
  } catch {
    return false
  }
}

function isOffDevice(): boolean {
  if (typeof window === 'undefined') return false
  const hostname = window.location?.hostname ?? ''
  return hostname !== '127.0.0.1' && hostname !== 'localhost'
}

export function getAuthErrorMessage(error: unknown): string {
  if (error == null) return GENERIC_ERROR
  if (typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message: string }).message === 'string') {
    const msg = (error as { message: string }).message
    if (/fetch|network|failed to load|load failed|authretryablefetcherror/i.test(msg)) {
      if (isLocalSupabase() && isOffDevice()) {
        return 'Cannot reach Supabase. This app is configured for localhost. Use your computer’s IP for VITE_SUPABASE_URL and open the app at that IP (see README).'
      }
      return 'Network unavailable. Check your connection and try again.'
    }
    return msg
  }
  return GENERIC_ERROR
}
