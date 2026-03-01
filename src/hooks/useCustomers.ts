import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Customer } from '../types/database'

export function useCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase.from('customers').select('*').order('name')
    if (e) {
      setError(e)
      setLoading(false)
      return
    }
    setCustomers((data ?? []) as Customer[])
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchCustomers()
  }, [fetchCustomers])

  const create = useCallback(
    async (input: Omit<Customer, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: row, error: e } = await supabase.from('customers').insert(input).select().single()
      if (e) throw e
      await fetchCustomers()
      return row as Customer
    },
    [fetchCustomers]
  )

  const update = useCallback(
    async (id: string, input: Partial<Omit<Customer, 'id' | 'user_id' | 'created_at'>>) => {
      const { data: row, error: e } = await supabase.from('customers').update(input).eq('id', id).select().single()
      if (e) throw e
      await fetchCustomers()
      return row as Customer
    },
    [fetchCustomers]
  )

  const remove = useCallback(
    async (id: string) => {
      const { error: e } = await supabase.from('customers').delete().eq('id', id)
      if (e) throw e
      await fetchCustomers()
    },
    [fetchCustomers]
  )

  return { customers, isLoading: loading, error, create, update, remove, refetch: fetchCustomers }
}

export function useCustomer(id: string | null) {
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(!!id)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!id) {
      setCustomer(null)
      setLoading(false)
      return
    }
    setLoading(true)
    supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: e }) => {
        if (e) setError(e)
        else setCustomer(data as Customer)
        setLoading(false)
      })
  }, [id])

  return { customer, isLoading: loading, error }
}
