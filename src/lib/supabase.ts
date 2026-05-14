import { createClient } from '@supabase/supabase-js'
import { isNativePlatform } from './platform/capacitor'
import { getAuthStorage } from './platform/storage'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!url) {
  console.warn('Missing VITE_SUPABASE_URL. Add .env.local with the value from `supabase status`.')
}

if (!anonKey) {
  console.warn('Missing VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY. Add .env.local with the value from `supabase status`.')
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
  auth: {
    storage: getAuthStorage(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: !isNativePlatform(),
  },
})
