import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { Invoice, InvoiceWithDetails, InvoiceLine } from '../types/database'

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: e } = await supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .order('created_at', { ascending: false })
    if (e) {
      setError(e)
      setLoading(false)
      return
    }
    setInvoices((data ?? []) as Invoice[])
    setLoading(false)
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchInvoices()
    })
  }, [fetchInvoices])

  const create = useCallback(
    async (input: Omit<Invoice, 'id' | 'created_at' | 'updated_at'>, lines: Omit<InvoiceLine, 'id' | 'invoice_id'>[]) => {
      const { data: inv, error: eInv } = await supabase.from('invoices').insert(input).select().single()
      if (eInv) throw eInv
      if (lines.length) {
        const linesWithInvoiceId = lines.map((l) => ({ ...l, invoice_id: (inv as Invoice).id }))
        const { error: eLines } = await supabase.from('invoice_lines').insert(linesWithInvoiceId)
        if (eLines) throw eLines
      }
      await fetchInvoices()
      return inv as Invoice
    },
    [fetchInvoices]
  )

  const update = useCallback(
    async (
      id: string,
      input: Partial<Omit<Invoice, 'id' | 'user_id' | 'created_at'>>,
      lines?: Omit<InvoiceLine, 'id' | 'invoice_id'>[]
    ) => {
      const { error: eInv } = await supabase.from('invoices').update(input).eq('id', id)
      if (eInv) throw eInv
      if (lines !== undefined) {
        await supabase.from('invoice_lines').delete().eq('invoice_id', id)
        if (lines.length) {
          const linesWithInvoiceId = lines.map((l) => ({ ...l, invoice_id: id }))
          const { error: eLines } = await supabase.from('invoice_lines').insert(linesWithInvoiceId)
          if (eLines) throw eLines
        }
      }
      await fetchInvoices()
    },
    [fetchInvoices]
  )

  const remove = useCallback(
    async (id: string) => {
      await supabase.from('invoice_lines').delete().eq('invoice_id', id)
      const { error: e } = await supabase.from('invoices').delete().eq('id', id)
      if (e) throw e
      await fetchInvoices()
    },
    [fetchInvoices]
  )

  const getNextNumber = useCallback(async (userId: string): Promise<number> => {
    const { data, error } = await supabase.rpc('get_next_invoice_number', { p_user_id: userId })
    if (error) throw error
    return data as number
  }, [])

  return { invoices, isLoading: loading, error, create, update, remove, getNextNumber, refetch: fetchInvoices }
}

export function useInvoice(id: string | null) {
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null)
  const [loading, setLoading] = useState(!!id)

  const fetchInvoice = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data: inv, error: eInv } = await supabase
      .from('invoices')
      .select('*, customer:customers(*)')
      .eq('id', id)
      .single()
    if (eInv) {
      setLoading(false)
      return
    }
    const { data: lines, error: eLines } = await supabase
      .from('invoice_lines')
      .select('*')
      .eq('invoice_id', id)
      .order('sort_order')
    if (eLines) {
      setLoading(false)
      return
    }
    const linesWithTotal = (lines ?? []).map((l: InvoiceLine) => ({
      ...l,
      total: l.quantity * l.unit_price,
    }))
    setInvoice({
      ...(inv as Invoice),
      customer: (inv as { customer: unknown }).customer as InvoiceWithDetails['customer'],
      lines: linesWithTotal,
    })
    setLoading(false)
  }, [id])

  useEffect(() => {
    queueMicrotask(() => {
      void fetchInvoice()
    })
  }, [fetchInvoice])

  return { invoice: id ? invoice : null, isLoading: id ? loading : false, refetch: fetchInvoice }
}
