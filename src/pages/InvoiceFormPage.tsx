import { useNavigate, useParams, Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useRef, useState } from 'react'
import { CirclePlus } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
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
import { LoadingText } from '../components/ui/LoadingText'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
import { Select } from '../components/ui/Select'
import { NativeInput } from '../components/ui/NativeInput'
import { InvoiceLineRow } from '../components/ui/InvoiceLineRow'
import { PageScroll } from '../components/Layout/PageScroll'
import type { Customer, Invoice, InvoiceStatus, RecurrenceUnit, TaxType } from '../types/database'
import type { InvoiceLine } from '../types/database'
import type { InvoiceDraft } from '../types/invoice-draft'

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

function normalizeCustomerLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Prefer draft id only when it exists in `customers`. Otherwise match `customer_name`
 * (exact, substring, or single token-overlap hit). Never return an id that is not in the list —
 * that yields an empty-looking &lt;select&gt; and blocked the follow-up effect when `current` was truthy.
 */
function resolveCustomerIdFromDraft(draft: InvoiceDraft, customers: Customer[]): string {
  if (customers.length === 0) return ''

  const rawId = draft.customer_id?.trim() ?? ''
  if (rawId && customers.some((c) => c.id === rawId)) return rawId

  const name = normalizeCustomerLabel(draft.customer_name)
  if (!name) return ''

  const exact = customers.find((c) => normalizeCustomerLabel(c.name) === name)
  if (exact) return exact.id

  const narrow = customers.filter((c) => {
    const cn = normalizeCustomerLabel(c.name)
    return cn.includes(name) || name.includes(cn)
  })
  if (narrow.length === 1) return narrow[0].id

  const tokens = name.split(/\s+/).filter((t) => t.length > 1)
  if (tokens.length > 0) {
    const byTokens = customers.filter((c) => {
      const cn = normalizeCustomerLabel(c.name)
      return tokens.every((t) => cn.includes(t))
    })
    if (byTokens.length === 1) return byTokens[0].id
  }

  return ''
}

function assistantDraftKey(d: InvoiceDraft): string {
  return JSON.stringify({
    n: d.customer_name,
    id: d.customer_id,
    issue: d.issue_date,
    due: d.due_date,
    lines: d.lines.map((l) => [l.description, l.quantity, l.unit_price, l.invoice_item_id]),
  })
}

interface LineRow {
  id: string
  description: string
  quantity: number | ''
  unit_price: number | ''
  invoice_item_id: string | null
}

export function InvoiceFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { invoice, isLoading: loadingInvoice } = useInvoice(id ?? null)
  const { create, update, getNextNumber } = useInvoices()
  const { sequence, isLoading: loadingSequence } = useInvoiceSequence(user?.id)
  const { customers } = useCustomers()
  const { items } = useInvoiceItems()
  const [lines, setLines] = useState<LineRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const initializedForId = useRef<string | null>(null)
  const draftFromAssistantApplied = useRef(false)
  const assistantDraftKeyRef = useRef<string | null>(null)

  const { register, handleSubmit, watch, reset, setValue, getValues, formState: { errors } } = useForm<FormData>({
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
      return <LoadingText small>Loading invoice number…</LoadingText>
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
  }, [invoice, id, navigate, reset])

  useEffect(() => {
    if (id) return
    if (!sequence) return
    if (watchedNumber != null) return
    setValue('number', getNextInvoiceCounter(sequence))
  }, [id, sequence, setValue, watchedNumber])

  useEffect(() => {
    if (id) return
    const draft = (location.state as { draft?: InvoiceDraft } | null)?.draft
    if (!draft) {
      draftFromAssistantApplied.current = false
      assistantDraftKeyRef.current = null
      return
    }

    const key = assistantDraftKey(draft)
    if (assistantDraftKeyRef.current !== key) {
      assistantDraftKeyRef.current = key
      draftFromAssistantApplied.current = false
    }

    const customerId = resolveCustomerIdFromDraft(draft, customers)

    if (!draftFromAssistantApplied.current) {
      draftFromAssistantApplied.current = true
      reset({
        customer_id: customerId,
        status: 'draft',
        issue_date: draft.issue_date.slice(0, 10),
        due_date: draft.due_date.slice(0, 10),
        tax_type: null,
        tax_value: 0,
        is_recurring: false,
        recurrence_every: 1,
        recurrence_unit: 'months',
        next_run_date: '',
        number: undefined,
      })
      setLines(
        draft.lines.map((l) => ({
          id: uid(),
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          invoice_item_id: l.invoice_item_id,
        })),
      )
      return
    }

    // Customers often load after the first paint, or the first reset had '' / an id not in the list.
    const current = getValues('customer_id')
    const currentValid = Boolean(current) && customers.length > 0 && customers.some((c) => c.id === current)
    if (customerId && !currentValid) {
      setValue('customer_id', customerId, { shouldDirty: false, shouldValidate: true })
    }
  }, [id, location.state, customers, reset, setValue, getValues])

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
      .filter((l) => l.description.trim() && Number(l.quantity) > 0)
      .map((l, i) => ({
        description: l.description,
        quantity: typeof l.quantity === 'number' ? l.quantity : Number(l.quantity || 0),
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

  if (id && loadingInvoice) return <LoadingText />

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageScroll>
        <div className="max-w-2xl mx-auto w-full space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <PageHeading>{id ? 'Edit invoice' : 'New invoice'}</PageHeading>
              <Link to={id ? `/invoices/${id}` : '/invoices'}>
                <Button variant="ghost" size="sm">Cancel</Button>
              </Link>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit((data) => onSubmit(data as FormData))} className="space-y-6">
                {submitError ? <InlineAlert variant="error">{submitError}</InlineAlert> : null}
                <div>
                  {invoiceNumberControl}
                </div>
                <Select label="Customer" error={errors.customer_id?.message} {...register('customer_id')}>
                  <option value="">Select customer</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </Select>
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
                      <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm text-gray-700">
                        <span className="shrink-0">Every</span>
                        <div className="grid min-w-0 flex-1 basis-0 grid-cols-3 gap-2">
                          <div className="col-span-1 min-w-0">
                            <NativeInput
                              type="number"
                              min={1}
                              wrapperClassName="min-w-0"
                              className="w-full min-w-0"
                              {...register('recurrence_every')}
                            />
                          </div>
                          <div className="col-span-2 min-w-0">
                            <Select containerClassName="min-w-0" {...register('recurrence_unit')}>
                              <option value="days">days</option>
                              <option value="weeks">weeks</option>
                              <option value="months">months</option>
                              <option value="years">years</option>
                            </Select>
                          </div>
                        </div>
                      </div>
                      <div className="flex min-w-0 items-center gap-2 text-sm text-gray-700">
                        <span className="shrink-0">starting on</span>
                        <NativeInput
                          type="date"
                          wrapperClassName="min-w-0 flex-1"
                          className="w-full min-w-0"
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
                  <div className="min-w-0 space-y-1">
                    {lines.map((line, index) => (
                      <InvoiceLineRow
                        key={line.id}
                        lineNumber={index + 1}
                        description={line.description}
                        quantity={line.quantity}
                        unitPrice={line.unit_price}
                        onDescriptionChange={(value) => updateLine(line.id, 'description', value)}
                        onQuantityChange={(value) => updateLine(line.id, 'quantity', value)}
                        onUnitPriceChange={(value) => updateLine(line.id, 'unit_price', value)}
                        onRemove={() => removeLine(line.id)}
                      />
                    ))}
                  </div>
                  <br />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Button type="button" variant="secondary" size="sm" onClick={addLine}>
                      <CirclePlus className="h-4 w-4 shrink-0" aria-hidden />
                      Add line
                    </Button>
                    {items.length > 0 && (
                      <Select
                        inputSize="sm"
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
                      </Select>
                    )}
                  </div>
                </div>
                {/* Tax rate */}
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                  <div className="grid min-w-0 grid-cols-3 gap-2">
                    <Select containerClassName="col-span-2 min-w-0" {...register('tax_type')}>
                      <option value="">None</option>
                      <option value="percent">Percent</option>
                      <option value="fixed">Fixed amount</option>
                    </Select>
                    <NativeInput
                      type="number"
                      min={0}
                      step={0.01}
                      suffix={watch('tax_type') === 'fixed' ? '$' : watch('tax_type') === 'percent' ? '%' : ''}
                      wrapperClassName="col-span-1 min-w-0"
                      {...register('tax_value')}
                    />
                  </div>
                </div>
                {/* Status */}
                <Select label="Status" {...register('status')}>
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
                <Button type="submit" fullWidth>{id ? 'Update invoice' : 'Create invoice'}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageScroll>
    </div>
  )
}
