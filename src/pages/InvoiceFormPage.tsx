import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useInvoice, useInvoices } from '../hooks/useInvoices'
import { useInvoiceSequence } from '../hooks/useInvoiceSequence'
import { useCustomers } from '../hooks/useCustomers'
import { useInvoiceItems } from '../hooks/useInvoiceItems'
import { formatInvoiceDisplay, getNextInvoiceCounter } from '../lib/invoice-number'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { InlineInvoiceNumberInput } from '../components/ui/InlineInvoiceNumberInput'
import type { Invoice, InvoiceStatus, RecurrenceUnit, TaxType } from '../types/database'
import type { InvoiceLine } from '../types/database'

const schema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']),
  issue_date: z.string().min(1, 'Required'),
  due_date: z.string().min(1, 'Required'),
  number: z.coerce.number().min(1).optional(),
  tax_type: z.union([z.enum(['fixed', 'percent']), z.literal('')]).optional().nullable(),
  tax_value: z.coerce.number().min(0).optional().default(0),
  is_recurring: z.boolean(),
  recurrence_every: z.coerce.number().min(1).optional().default(1),
  recurrence_unit: z.enum(['days', 'weeks', 'months', 'years']).optional(),
  next_run_date: z.string().optional(),
}).refine((data) => !data.is_recurring || (data.next_run_date != null && data.next_run_date.trim() !== ''), {
  message: 'Next run date is required for recurring invoices',
  path: ['next_run_date'],
})

type FormData = z.infer<typeof schema>

const uid = () => Math.random().toString(36).slice(2)

interface LineRow {
  id: string
  description: string
  quantity: number
  unit_price: number | ''
  invoice_item_id: string | null
}

export function InvoiceFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { invoice, isLoading: loadingInvoice } = useInvoice(id ?? null)
  const { create, update, getNextNumber } = useInvoices()
  const { sequence, isLoading: loadingSequence } = useInvoiceSequence(user?.id)
  const { customers } = useCustomers()
  const { items } = useInvoiceItems()
  const [lines, setLines] = useState<LineRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const initializedForId = useRef<string | null>(null)

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      status: 'draft',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      tax_type: null,
      tax_value: 0,
      is_recurring: false,
      recurrence_every: 1,
      recurrence_unit: 'months',
      next_run_date: '',
      number: undefined,
    },
  })

  const isRecurring = watch('is_recurring')
  const watchedNumber = watch('number')
  const isSentRecurring = !!(invoice && invoice.is_recurring && invoice.status === 'sent')
  const parsedWatchedNumber =
    typeof watchedNumber === 'number'
      ? watchedNumber
      : typeof watchedNumber === 'string' && watchedNumber !== ''
        ? Number(watchedNumber)
        : null

  const currentInvoiceCounter =
    parsedWatchedNumber != null && !Number.isNaN(parsedWatchedNumber)
      ? parsedWatchedNumber
      : id
        ? invoice?.number ?? null
        : (sequence?.counter ?? 0) + 1
  const currentInvoiceDisplay =
    sequence && currentInvoiceCounter != null ? formatInvoiceDisplay(sequence, currentInvoiceCounter) : null

  const invoiceNumberControl = (() => {
    if (id && isSentRecurring) {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
          <p className="text-gray-700 py-2">{invoice?.number_display ?? String(invoice?.number ?? '—')}</p>
        </div>
      )
    }

    if (!id && (loadingSequence || !sequence)) {
      return <p className="text-sm text-gray-500">Loading invoice number…</p>
    }

    const minNumber = id ? (invoice?.number ?? 1) : (sequence?.counter ?? 0) + 1
    return (
      <>
        <InlineInvoiceNumberInput
          label="Invoice number"
          type="number"
          min={minNumber}
          error={errors.number?.message}
          prefixLabel={sequence?.prefix ?? ''}
          digits={sequence?.length ?? 1}
          suffixLabel={sequence?.suffix ?? ''}
          {...register('number')}
          value={watch('number') ?? ''}
        />
        {currentInvoiceDisplay && (
          <p className="text-sm text-gray-500 mt-1">
            Invoice Number: {currentInvoiceDisplay}
          </p>
        )}
      </>
    )
  })()

  useEffect(() => {
    const locked = invoice && (invoice.status === 'paid' || invoice.status === 'cancelled' || (invoice.status === 'sent' && !invoice.is_recurring));
    if (invoice && locked) {
      navigate(`/invoices/${id}`, { replace: true })
      return
    }
    if (invoice && initializedForId.current !== invoice.id) {
      initializedForId.current = invoice.id
      reset({
        customer_id: invoice.customer_id,
        status: invoice.status,
        issue_date: invoice.issue_date.slice(0, 10),
        due_date: invoice.due_date.slice(0, 10),
        tax_type: invoice.tax_type ?? null,
        tax_value: invoice.tax_value ?? 0,
        is_recurring: invoice.is_recurring,
        recurrence_every: invoice.recurrence_every ?? 1,
        recurrence_unit: (invoice.recurrence_unit ?? 'months') as RecurrenceUnit,
        next_run_date: invoice.next_recurrence_at ? invoice.next_recurrence_at.slice(0, 10) : '',
        number: invoice.number,
      })
      setLines(
        invoice.lines.map((l) => ({
          id: l.id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          invoice_item_id: l.invoice_item_id,
        }))
      )
    }
  }, [invoice, reset])

  useEffect(() => {
    if (id) return
    if (!sequence) return
    if (watchedNumber != null) return
    setValue('number', getNextInvoiceCounter(sequence))
  }, [id, sequence, setValue, watchedNumber])

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        description: '',
        quantity: 1,
        unit_price: 0,
        invoice_item_id: null,
      },
    ])
  }

  const addItemAsLine = (item: { id: string; name: string; description: string | null; unit_price: number }) => {
    setLines((prev) => [
      ...prev,
      {
        id: uid(),
        description: item.description || item.name,
        quantity: 1,
        unit_price: Number(item.unit_price),
        invoice_item_id: item.id,
      },
    ])
  }

  const updateLine = (lineId: string, field: keyof LineRow, value: string | number) => {
    setLines((prev) => prev.map((l) => (l.id === lineId ? { ...l, [field]: value } : l)))
  }

  const removeLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId))
  }

  const onSubmit = async (data: FormData) => {
    setSubmitError(null)
    if (!user) return
    const linePayload: Omit<InvoiceLine, 'id' | 'invoice_id'>[] = lines
      .filter((l) => l.description.trim() && l.quantity > 0)
      .map((l, i) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price: typeof l.unit_price === 'number' ? l.unit_price : Number(l.unit_price || 0),
        sort_order: i,
        invoice_item_id: l.invoice_item_id,
      }))
    if (linePayload.length === 0) {
      setSubmitError('Add at least one line item with quantity > 0')
      return
    }
    const basePayload: Partial<Omit<Invoice, 'id' | 'created_at' | 'user_id' | 'updated_at'>> & {
      user_id: string
      customer_id: string
      status: InvoiceStatus
      issue_date: string
      due_date: string
      tax_type: TaxType
      tax_value: number
      is_recurring: boolean
    } = {
      user_id: user.id,
      customer_id: data.customer_id,
      status: data.status as InvoiceStatus,
      issue_date: data.issue_date,
      due_date: data.due_date,
      tax_type: (data.tax_type === 'fixed' || data.tax_type === 'percent' ? data.tax_type : null) as TaxType,
      tax_value: data.tax_value ?? 0,
      is_recurring: data.is_recurring,
      recurrence_every: data.is_recurring ? (data.recurrence_every ?? 1) : null,
      recurrence_unit: data.is_recurring ? (data.recurrence_unit as RecurrenceUnit) : null,
      next_recurrence_at: null as string | null,
    }
    if (data.is_recurring && data.next_run_date?.trim()) {
      const next = new Date(data.next_run_date.trim() + 'T00:00:00.000Z')
        ; (basePayload as { next_recurrence_at: string }).next_recurrence_at = next.toISOString()
    }
    try {
      if (id) {
        // Sent invoices are immutable for number/display — never re-send those columns or sequence
        // would reformat from current settings (e.g. only editing next recurrence).
        if (invoice?.status === 'sent') {
          await update(id, basePayload, linePayload)
          navigate(`/invoices/${id}`)
        } else {
          const existingNumber = invoice?.number ?? 0
          const desiredNumber = data.number ?? existingNumber
          if (desiredNumber <= 0 || !existingNumber) {
            setSubmitError('Invalid invoice number')
            return
          }
          if (desiredNumber < existingNumber) {
            setSubmitError('Invoice number can only be increased')
            return
          }

          const number_display = formatInvoiceDisplay(sequence, desiredNumber)
          await update(
            id,
            {
              ...basePayload,
              number: desiredNumber,
              number_display,
            },
            linePayload
          )

          // Keep invoice sequence counter in sync so future invoices don't reuse this number.
          const currentSequenceCounter = sequence?.counter ?? desiredNumber
          const nextCounter = Math.max(currentSequenceCounter, desiredNumber)
          const { error: seqErr } = await supabase
            .from('invoice_sequences')
            .update({ counter: nextCounter })
            .eq('user_id', user.id)
          if (seqErr) throw seqErr
          navigate(`/invoices/${id}`)
        }
      } else {
        const minAllowedNumber = (sequence?.counter ?? 0) + 1
        const desiredNumber = data.number ?? null

        let counter: number
        const shouldSyncSequence = desiredNumber != null

        if (desiredNumber != null) {
          if (desiredNumber < minAllowedNumber) {
            setSubmitError(`Invoice number must be at least ${minAllowedNumber}`)
            return
          }
          counter = desiredNumber
        } else {
          counter = await getNextNumber(user.id)
        }

        const number_display = formatInvoiceDisplay(sequence, counter)
        const invPayload: Omit<Invoice, 'id' | 'created_at' | 'updated_at'> = {
          ...(basePayload as Omit<Invoice, 'id' | 'created_at' | 'updated_at'>),
          number: counter,
          number_display,
        }
        await create(invPayload, linePayload)

        // Only advance the sequence counter after the invoice was actually created successfully.
        if (shouldSyncSequence && desiredNumber != null) {
          const nextCounter = Math.max(sequence?.counter ?? 0, desiredNumber)
          const { error: seqErr } = await supabase
            .from('invoice_sequences')
            .update({ counter: nextCounter })
            .eq('user_id', user.id)
          if (seqErr) throw seqErr
        }

        navigate('/invoices')
      }
    } catch (e) {
      const anyErr = e as { message?: string; code?: string } | null | undefined
      const message = anyErr?.message ?? ''
      const code = anyErr?.code

      if (code === '23505' || message.toLowerCase().includes('duplicate')) {
        setSubmitError('An invoice with this number already exists')
      } else {
        setSubmitError(anyErr instanceof Error ? anyErr.message : 'Failed to save')
      }
    }
  }

  if (id && loadingInvoice) return <p className="text-gray-500">Loading...</p>

  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <h2 className="text-lg font-semibold">{id ? 'Edit invoice' : 'New invoice'}</h2>
          <Link to={id ? `/invoices/${id}` : '/invoices'}>
            <Button variant="ghost" size="sm">Cancel</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => onSubmit(data as FormData))} className="space-y-6">
            {submitError && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">{submitError}</p>
            )}
            <div>
              {invoiceNumberControl}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                {...register('customer_id')}
              >
                <option value="">Select customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.customer_id && <p className="mt-1 text-sm text-red-600">{errors.customer_id.message}</p>}
            </div>
            <br />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0">
                <Input label="Issue date" type="date" error={errors.issue_date?.message} {...register('issue_date')} />
              </div>
              <div className="min-w-0">
                <Input label="Due date" type="date" error={errors.due_date?.message} {...register('due_date')} />
              </div>
            </div>
            {/* Recurring */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  {...register('is_recurring')}
                  className="rounded border-gray-300"
                />
                <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700">
                  Recurring invoice
                </label>
              </div>
              {isRecurring && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
                    <span>Every</span>
                    <input
                      type="number"
                      min={1}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm"
                      {...register('recurrence_every')}
                    />
                    <select
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm"
                      {...register('recurrence_unit')}
                    >
                      <option value="days">days</option>
                      <option value="weeks">weeks</option>
                      <option value="months">months</option>
                      <option value="years">years</option>
                    </select>
                    <span>starting on</span>
                    <input
                      type="date"
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 text-sm"
                      {...register('next_run_date')}
                    />
                  </div>
                  {errors.next_run_date && (
                    <p className="text-sm text-red-600">{errors.next_run_date.message}</p>
                  )}
                </div>
              )}
            </div>
            <br />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Line items</label>
              <div className="space-y-2">
                {lines.map((line) => (
                  <div key={line.id} className="flex gap-2 items-start">
                    <input
                      className="flex-1 min-w-0 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      placeholder="Description"
                      value={line.description}
                      onChange={(e) => updateLine(line.id, 'description', e.target.value)}
                    />
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className="w-16 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.id, 'quantity', Number(e.target.value))}
                    />
                    <div className="flex items-stretch border border-gray-300 rounded text-sm overflow-hidden">
                      <span className="inline-flex items-center pl-2 pr-1 py-1.5 bg-gray-50 text-gray-600 text-sm border-r border-gray-300">
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        className="w-20 px-2 py-1.5 border-0 focus:ring-0 focus:outline-none text-sm"
                        value={line.unit_price}
                        onChange={(e) => {
                          const next = e.target.value
                          updateLine(line.id, 'unit_price', next === '' ? '' : Number(next))
                        }}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(line.id)}>×</Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="button" variant="secondary" size="sm" onClick={addLine}>Add line</Button>
                {items.length > 0 && (
                  <select
                    className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                    value=""
                    onChange={(e) => {
                      const item = items.find((i) => i.id === e.target.value)
                      if (item) addItemAsLine(item)
                    }}
                  >
                    <option value="">Add saved item</option>
                    {items.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            {/* Tax rate */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                <div className="flex gap-2">
                  <select
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900"
                    {...register('tax_type')}
                  >
                    <option value="">None</option>
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed amount</option>
                  </select>
                  <div className="flex">
                    {watch('tax_type') === 'fixed' && (
                      <span className="inline-flex items-center px-3 py-2 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-600 text-sm">
                        $
                      </span>
                    )}
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className={[
                        'px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-gray-900',
                        watch('tax_type') === 'fixed' ? 'rounded-r-lg w-24' : 'rounded-lg w-24',
                      ].join(' ')}
                      placeholder={watch('tax_type') === 'percent' ? '%' : '0.00'}
                      {...register('tax_value')}
                    />
                  </div>
                </div>
              </div>
            </div>
            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" {...register('status')}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <Button type="submit" fullWidth>{id ? 'Update invoice' : 'Create invoice'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
