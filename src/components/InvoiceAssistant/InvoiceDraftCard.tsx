import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/useAuth'
import { useInvoices } from '../../hooks/useInvoices'
import { useInvoiceSequence } from '../../hooks/useInvoiceSequence'
import { formatInvoiceDisplay } from '../../lib/invoice-number'
import type { Invoice, InvoiceLine, InvoiceStatus, TaxType } from '../../types/database'
import type { InvoiceDraft } from '../../types/invoice-draft'
import { Button } from '../ui/Button'
import { Card, CardContent } from '../ui/Card'
import { InlineAlert } from '../ui/InlineAlert'
import { useCloseAssistant } from '../Layout/assistantModalContext'

export function InvoiceDraftPreview(props: { draft: InvoiceDraft }) {
  const { draft } = props
  const subtotal = draft.lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)

  return (
    <Card className="my-2 w-full min-w-0 border-indigo-200 bg-white">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Invoice draft</p>
          <p className="text-sm font-semibold text-gray-900">{draft.customer_name}</p>
          <p className="text-xs text-gray-600">
            {draft.issue_date} → due {draft.due_date}
          </p>
        </div>
        <ul className="space-y-1 text-sm text-gray-800">
          {draft.lines.map((line, i) => (
            <li key={i} className="flex justify-between gap-2 border-b border-gray-100 pb-1 last:border-0">
              <span className="min-w-0 flex-1 break-words">{line.description}</span>
              <span className="shrink-0 text-gray-600">
                {line.quantity} × {line.unit_price.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-sm font-medium text-gray-900">Subtotal: {subtotal.toFixed(2)}</p>
        {!draft.customer_id ? (
          <InlineAlert variant="error">
            No matching customer in your list. Use &quot;Edit in form&quot; to pick a customer.
          </InlineAlert>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function InvoiceDraftCard(props: { draft: InvoiceDraft }) {
  const { draft } = props
  const navigate = useNavigate()
  const { user } = useAuth()
  const { create, getNextNumber } = useInvoices()
  const { sequence } = useInvoiceSequence(user?.id)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const closeAssistant = useCloseAssistant()

  const goToForm = useCallback(() => {
    closeAssistant()
    navigate('/invoices/new', { state: { draft } })
  }, [closeAssistant, draft, navigate])

  const createNow = useCallback(async () => {
    if (!user || !draft.customer_id) return
    setErr(null)
    setBusy(true)
    closeAssistant()
    try {
      const linePayload: Omit<InvoiceLine, 'id' | 'invoice_id'>[] = draft.lines.map((l, i) => ({
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        sort_order: i,
        invoice_item_id: l.invoice_item_id,
      }))
      const counter = await getNextNumber(user.id)
      const number_display = formatInvoiceDisplay(sequence, counter)
      const invPayload: Omit<Invoice, 'id' | 'created_at' | 'updated_at'> = {
        user_id: user.id,
        customer_id: draft.customer_id,
        status: 'draft' as InvoiceStatus,
        issue_date: draft.issue_date,
        due_date: draft.due_date,
        number: counter,
        number_display,
        tax_type: null as TaxType,
        tax_value: 0,
        is_recurring: false,
        recurrence_every: null,
        recurrence_unit: null,
        next_recurrence_at: null,
      }
      const inv = await create(invPayload, linePayload)
      navigate(`/invoices/${inv.id}`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create invoice')
    } finally {
      setBusy(false)
    }
  }, [closeAssistant, create, draft, getNextNumber, navigate, sequence, user])

  return (
    <div className="space-y-2">
      <InvoiceDraftPreview draft={draft} />
      {err ? <InlineAlert variant="error">{err}</InlineAlert> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={goToForm} disabled={busy}>
          Edit in form
        </Button>
        <Button type="button" size="sm" onClick={() => void createNow()} disabled={busy || !draft.customer_id}>
          {busy ? 'Creating…' : 'Create now'}
        </Button>
      </div>
    </div>
  )
}
