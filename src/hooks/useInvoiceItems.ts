import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { InvoiceItem } from '../types/database'

export function useInvoiceItems() {
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase.from('invoice_items').select('*').order('name')
    if (e) {
      setError(e)
      setLoading(false)
      return
    }
    setItems((data ?? []) as InvoiceItem[])
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchItems()
    })
  }, [fetchItems])

  const create = useCallback(
    async (input: Omit<InvoiceItem, 'id' | 'created_at'>) => {
      const { data: row, error: e } = await supabase.from('invoice_items').insert(input).select().single()
      if (e) throw e
      await fetchItems()
      return row as InvoiceItem
    },
    [fetchItems]
  )

  const update = useCallback(
    async (id: string, input: Partial<Omit<InvoiceItem, 'id' | 'user_id' | 'created_at'>>) => {
      const { data: row, error: e } = await supabase.from('invoice_items').update(input).eq('id', id).select().single()
      if (e) throw e
      await fetchItems()
      return row as InvoiceItem
    },
    [fetchItems]
  )

  const remove = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from('invoice_items').delete().eq('id', id)
      if (e) throw e
      await fetchItems()
    },
    [fetchItems]
  )

  return { items, isLoading: loading, error, create, update, remove, refetch: fetchItems }
}

export function useInvoiceItem(id: string | null) {
  const [item, setItem] = useState<InvoiceItem | null>(null)
  const [loading, setLoading] = useState(!!id)

  useEffect(() => {
    if (!id) return
    queueMicrotask(() => {
      setLoading(true)
      void supabase
        .from('invoice_items')
        .select('*')
        .eq('id', id)
        .single()
        .then(({ data, error: e }) => {
          if (!e) setItem(data as InvoiceItem)
          setLoading(false)
        })
    })
  }, [id])

  return { item: id ? item : null, isLoading: id ? loading : false }
}
