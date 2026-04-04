const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '') ?? ''

export function isAssistantConfigured(): boolean {
  return Boolean(supabaseUrl)
}
