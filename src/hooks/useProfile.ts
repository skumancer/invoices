import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(!!userId)
  const [error, setError] = useState<Error | null>(null)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      setError(null)
      return
    }
    setLoading(true)
    setError(null)
    const { data, error: selectErr } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (selectErr) {
      setProfile(null)
      setError(selectErr as Error)
      setLoading(false)
      return
    }
    if (data) {
      setProfile(data as Profile)
      setLoading(false)
      return
    }
    const { data: inserted, error: insertErr } = await supabase
      .from('profiles')
      .insert({ id: userId })
      .select()
      .single()
    if (insertErr) {
      setProfile(null)
      setError(insertErr as Error)
      setLoading(false)
      return
    }
    setProfile(inserted as Profile)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const update = useCallback(
    async (input: Partial<Pick<Profile, 'first_name' | 'last_name' | 'display_name'>>) => {
      if (!userId) return
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...input, updated_at: new Date().toISOString() })
        .eq('id', userId)
        .select()
        .single()
      if (error) throw error
      setProfile(data as Profile)
      return data as Profile
    },
    [userId]
  )

  return { profile, isLoading: loading, error, refetch: fetchProfile, update }
}
