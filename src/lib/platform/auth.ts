import { isNativePlatform } from './capacitor'

function normalizedPath(path: string): string {
  if (!path.startsWith('/')) return `/${path}`
  return path
}

export function getAuthRedirectUrl(path: string): string {
  const nativeRedirect = import.meta.env.VITE_MOBILE_AUTH_REDIRECT_URL
  if (isNativePlatform() && typeof nativeRedirect === 'string' && nativeRedirect.length > 0) {
    const normalized = normalizedPath(path)
    return `${nativeRedirect.replace(/\/$/, '')}${normalized}`
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}${normalizedPath(path)}`
}

export function getPathFromIncomingUrl(urlString: string): string | null {
  try {
    const url = new URL(urlString)
    const path = url.pathname || '/'
    const hash = url.hash?.startsWith('#') ? url.hash.slice(1) : url.hash
    const query = url.search ?? ''

    // Supabase recovery links often carry token data in hash fragment.
    if (hash && hash.includes('type=recovery')) {
      return `/reset-password#${hash}`
    }

    if (!path || path === '/') {
      if (query || hash) return `/${query}${hash ? `#${hash}` : ''}`
      return '/'
    }

    return `${path}${query}${hash ? `#${hash}` : ''}`
  } catch {
    return null
  }
}
