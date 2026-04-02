import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { InvoiceSequence } from '../types/database'

export function useInvoiceSequence(userId: string | undefined) {
  const [sequence, setSequence] = useState<InvoiceSequence | null>(null)
  const [loading, setLoading] = useState(!!userId)
  const [error, setError] = useState<Error | null>(null)

  const fetchSequence = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError(null)
    const { data, error: selectErr } = await supabase
      .from('invoice_sequences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (selectErr) {
      setSequence(null)
      setError(selectErr as Error)
    } else {
      setSequence((data as InvoiceSequence) ?? null)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchSequence()
    })
  }, [fetchSequence])

  const updateSequence = useCallback(
    async (input: Pick<InvoiceSequence, 'prefix' | 'suffix' | 'length'>) => {
      if (!userId) return
      const { data, error: upsertErr } = await supabase
        .from('invoice_sequences')
        .upsert(
          {
            user_id: userId,
            prefix: input.prefix ?? '',
            suffix: input.suffix ?? '',
            length: Math.max(1, input.length ?? 1),
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single()
      if (upsertErr) throw upsertErr
      setSequence(data as InvoiceSequence)
      return data as InvoiceSequence
    },
    [userId]
  )

  return {
    sequence: userId ? sequence : null,
    isLoading: userId ? loading : false,
    error: userId ? error : null,
    refetch: fetchSequence,
    updateSequence,
  }
}
