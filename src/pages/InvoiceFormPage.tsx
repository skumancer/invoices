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
import { formatInvoiceNumber } from '../lib/invoice-number'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import type { InvoiceStatus, RecurrenceInterval, TaxType } from '../types/database'
import type { InvoiceLine } from '../types/database'

const schema = z.object({
  customer_id: z.string().min(1, 'Select a customer'),
  status: z.enum(['draft', 'sent', 'paid', 'cancelled']),
  issue_date: z.string().min(1, 'Required'),
  due_date: z.string().min(1, 'Required'),
  tax_type: z.union([z.enum(['fixed', 'percent']), z.literal('')]).optional().nullable(),
  tax_value: z.coerce.number().min(0).optional().default(0),
  is_recurring: z.boolean(),
  recurrence_interval: z.enum(['monthly', 'yearly']).optional(),
  recurrence_day: z.coerce.number().min(1).max(31).optional().default(1),
})

type FormData = z.infer<typeof schema>

const uid = () => Math.random().toString(36).slice(2)

interface LineRow {
  id: string
  description: string
  quantity: number
  unit_price: number
  invoice_item_id: string | null
}

export function InvoiceFormPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { invoice, isLoading: loadingInvoice } = useInvoice(id ?? null)
  const { create, update, getNextNumber } = useInvoices()
  const { sequence } = useInvoiceSequence(user?.id)
  const { customers } = useCustomers()
  const { items } = useInvoiceItems()
  const [lines, setLines] = useState<LineRow[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const initializedForId = useRef<string | null>(null)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      status: 'draft',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      tax_type: null,
      tax_value: 0,
      is_recurring: false,
      recurrence_interval: 'monthly',
      recurrence_day: 1,
    },
  })

  const isRecurring = watch('is_recurring')

  useEffect(() => {
    if (invoice && (invoice.status === 'sent' || invoice.status === 'paid' || invoice.status === 'cancelled')) {
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
        recurrence_interval: (invoice.recurrence_interval ?? 'monthly') as RecurrenceInterval,
        recurrence_day: invoice.recurrence_day ?? 1,
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
        unit_price: l.unit_price,
        sort_order: i,
        invoice_item_id: l.invoice_item_id,
      }))
    const basePayload = {
      user_id: user.id,
      customer_id: data.customer_id,
      status: data.status as InvoiceStatus,
      issue_date: data.issue_date,
      due_date: data.due_date,
      tax_type: (data.tax_type === 'fixed' || data.tax_type === 'percent' ? data.tax_type : null) as TaxType,
      tax_value: data.tax_value ?? 0,
      is_recurring: data.is_recurring,
      recurrence_interval: data.is_recurring ? (data.recurrence_interval as RecurrenceInterval) : null,
      recurrence_day: data.is_recurring ? (data.recurrence_day ?? 1) : null,
      next_recurrence_at: null as string | null,
    }
    if (data.is_recurring) {
      const due = new Date(data.due_date)
      const next = new Date(due)
      if (data.recurrence_interval === 'yearly') next.setFullYear(next.getFullYear() + 1)
      else next.setMonth(next.getMonth() + 1)
        ; (basePayload as { next_recurrence_at: string }).next_recurrence_at = next.toISOString()
    }
    try {
      if (id) {
        await update(id, basePayload, linePayload)
        navigate(`/invoices/${id}`)
      } else {
        const counter = await getNextNumber(user.id)
        const prefix = sequence?.prefix ?? ''
        const length = sequence?.length ?? 1
        const suffix = sequence?.suffix ?? ''
        const number_display = formatInvoiceNumber(prefix, length, suffix, counter)
        const invPayload = { ...basePayload, number: counter, number_display }
        await create(invPayload, linePayload)
        navigate('/invoices')
      }
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to save')
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice number</label>
              <p className="text-gray-700 py-2">
                {id
                  ? (invoice?.number_display ?? String(invoice?.number ?? '—'))
                  : `Next: ${formatInvoiceNumber(sequence?.prefix ?? '', sequence?.length ?? 1, sequence?.suffix ?? '', (sequence?.counter ?? 0) + 1)}`}
              </p>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="min-w-0">
                <Input label="Issue date" type="date" error={errors.issue_date?.message} {...register('issue_date')} />
              </div>
              <div className="min-w-0">
                <Input label="Due date" type="date" error={errors.due_date?.message} {...register('due_date')} />
              </div>
            </div>
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" {...register('status')}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="is_recurring" {...register('is_recurring')} className="rounded border-gray-300" />
              <label htmlFor="is_recurring" className="text-sm font-medium text-gray-700">Recurring invoice</label>
            </div>
            {isRecurring && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
                  <select className="w-full px-3 py-2 border border-gray-300 rounded-lg" {...register('recurrence_interval')}>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <Input label="Day of month (1–31)" type="number" min={1} max={31} {...register('recurrence_day')} />
              </div>
            )}
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
                        onChange={(e) => updateLine(line.id, 'unit_price', Number(e.target.value))}
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
            <Button type="submit" fullWidth>{id ? 'Update invoice' : 'Create invoice'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
