import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types/database'

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(!!userId)

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (error) {
      setProfile(null)
      setLoading(false)
      return
    }
    if (data) {
      setProfile(data as Profile)
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single()
      if (insertErr) {
        setProfile(null)
        setLoading(false)
        return
      }
      setProfile(inserted as Profile)
    }
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

  return { profile, isLoading: loading, refetch: fetchProfile, update }
}
