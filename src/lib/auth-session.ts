import { supabase } from './supabase'
import { clearSupabaseAuthStorage } from './platform/storage'

/**
 * Prefer server-side session invalidation (`global`), then fall back to clearing
 * the client session when offline or the revoke request fails (e.g. WKWebView load failed).
 */
export async function signOutWithServerInvalidation(): Promise<void> {
  const { error: globalErr } = await supabase.auth.signOut({ scope: 'global' })
  if (!globalErr) return

  const { error: localErr } = await supabase.auth.signOut({ scope: 'local' })
  if (!localErr) return

  await clearSupabaseAuthStorage()
}
