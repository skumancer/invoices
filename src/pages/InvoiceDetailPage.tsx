import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { CalendarX2, FileText, Loader2, Mail, Printer, SquarePen } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useInvoice } from '../hooks/useInvoices'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { IconStackButton, IconStackLink } from '../components/ui/IconStackButton'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { LoadingText } from '../components/ui/LoadingText'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
import { StatusBadge } from '../components/ui/StatusBadge'
import { formatDate } from '../lib/format'
import { buildInvoicePdf, INVOICE_BRANDING_LINE } from '../../supabase/functions/_shared/invoice-pdf'
import { recurrenceLabel } from '../lib/recurrence'
import { savePdfAndShareOrDownload } from '../lib/platform/file'
import { PageScroll } from '../components/Layout/PageScroll'

function computeTotals(
  lines: { quantity: number; unit_price: number }[],
  taxType: 'fixed' | 'percent' | null,
  taxValue: number
) {
  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unit_price, 0)
  const tax =
    !taxType || taxValue === 0 ? 0 : taxType === 'percent' ? (subtotal * taxValue) / 100 : taxValue
  const total = subtotal + tax
  return { subtotal, tax, total }
}

function senderLabel(profile: { first_name: string | null; last_name: string | null } | null, email: string | undefined): string {
  const first = profile?.first_name?.trim()
  const last = profile?.last_name?.trim()
  const name = [first, last].filter(Boolean).join(' ')
  return name || email || '—'
}

export function InvoiceDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { profile } = useProfile(user?.id)
  const { invoice, isLoading, refetch } = useInvoice(id ?? null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendToEmail, setSendToEmail] = useState('')
  const [sendEmailMessage, setSendEmailMessage] = useState('')
  const [markAsSentDialogOpen, setMarkAsSentDialogOpen] = useState(false)
  const [markingAsSent, setMarkingAsSent] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const [stopRecurrenceDialogOpen, setStopRecurrenceDialogOpen] = useState(false)
  const handleDownloadPdf = async () => {
    if (!invoice) return
    try {
      const customer = invoice.customer
      const lines = invoice.lines
      const { subtotal, tax, total } = computeTotals(
        lines,
        invoice.tax_type ?? null,
        invoice.tax_value ?? 0
      )
      const fromLabel = senderLabel(profile, user?.email)
      const pdfBytes = buildInvoicePdf({
        invNumber: invoice.number_display ?? String(invoice.number),
        fromLabel: fromLabel ?? '—',
        fromEmail: user?.email ?? '',
        fromTaxId: profile?.tax_id?.trim() || null,
        toName: customer?.name ?? '—',
        toEmail: customer?.email ?? '',
        toTaxId: customer?.tax_id?.trim() || null,
        issueDate: formatDate(invoice.issue_date),
        dueDate: formatDate(invoice.due_date),
        lines: lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
        })),
        subtotal,
        tax,
        total,
        taxType: invoice.tax_type ?? null,
        taxValue: invoice.tax_value ?? 0,
      })
      await savePdfAndShareOrDownload(
        `invoice-${invoice.number_display ?? invoice.number}.pdf`,
        new Uint8Array(pdfBytes)
      )
    } catch {
      window.print()
    }
  }

  const openSendDialog = () => {
    setSendToEmail(invoice?.customer?.email ?? '')
    setSendEmailMessage('')
    setSendResult(null)
    setSendDialogOpen(true)
  }

  const handleSendEmail = async () => {
    if (!id || !sendToEmail.trim()) return
    const message = sendEmailMessage
    setSending(true)
    setSendResult(null)
    setSendDialogOpen(false)
    const { data, error } = await supabase.functions.invoke('send-invoice-email', {
      body: {
        invoiceId: id,
        to: sendToEmail.trim(),
        message,
      },
    })
    setSending(false)
    if (error) {
      let message = error.message
      try {
        const res = (error as { context?: Response }).context
        if (res?.json) {
          const body = (await res.json()) as { error?: string }
          if (typeof body?.error === 'string') message = body.error
        }
      } catch {
        // keep error.message
      }
      setSendResult({ ok: false, message })
      return
    }
    setSendResult({ ok: true, message: (data as { message?: string })?.message ?? 'Email sent.' })
    if (invoice?.status === 'draft') {
      setMarkAsSentDialogOpen(true)
    }
  }

  const handleMarkAsSent = async () => {
    if (!id) return
    setMarkingAsSent(true)
    const { error } = await supabase.from('invoices').update({ status: 'sent' }).eq('id', id)
    setMarkingAsSent(false)
    setMarkAsSentDialogOpen(false)
    if (error) {
      setSendResult({ ok: false, message: error.message })
      return
    }
    await refetch()
  }

  const handleStopRecurrence = async () => {
    if (!id || !invoice?.is_recurring) return
    setStopping(true)
    setStopError(null)
    const { error } = await supabase
      .from('invoices')
      .update({
        is_recurring: false,
        recurrence_every: null,
        recurrence_unit: null,
        next_recurrence_at: null,
      })
      .eq('id', id)
    setStopping(false)
    if (error) {
      setStopError(error.message)
      return
    }
    setStopRecurrenceDialogOpen(false)
    await refetch()
  }

  if (!id || isLoading) return <LoadingText />
  if (!invoice) return <InlineAlert variant="error" appearance="plain">Invoice not found.</InlineAlert>

  const customer = invoice.customer
  const { subtotal, tax, total } = computeTotals(
    invoice.lines,
    invoice.tax_type ?? null,
    invoice.tax_value ?? 0
  )
  const isLocked = invoice.status === 'sent' || invoice.status === 'paid' || invoice.status === 'cancelled'
  const canEdit = !isLocked || (invoice.is_recurring && invoice.status === 'sent')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageScroll>
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-4">
            <PageHeading className="min-w-0 shrink-0">Invoice - {invoice.number_display ?? invoice.number}</PageHeading>
            <div className="flex w-full min-w-0 flex-wrap items-stretch justify-end gap-1 print:hidden sm:gap-2 md:w-auto">
              <IconStackButton
                compact
                variant="secondary"
                icon={<Printer />}
                label="Print"
                onClick={() => window.print()}
                aria-label="Print invoice"
              />
              <IconStackButton
                compact
                variant="secondary"
                icon={<FileText />}
                label="PDF"
                onClick={handleDownloadPdf}
                aria-label="Download PDF"
              />
              <IconStackButton
                compact
                variant="secondary"
                icon={sending ? <Loader2 className="animate-spin" /> : <Mail />}
                label="eMail"
                onClick={openSendDialog}
                disabled={sending}
                aria-label="Send invoice by email"
              />
              {invoice.is_recurring && (
                <IconStackButton
                  compact
                  variant="secondary"
                  icon={<CalendarX2 className="text-red-600" />}
                  label="Stop"
                  onClick={() => {
                    setStopError(null)
                    setStopRecurrenceDialogOpen(true)
                  }}
                  aria-label="Stop recurrence"
                />
              )}
              {canEdit && (
                <IconStackLink
                  compact
                  to={`/invoices/${id}/edit`}
                  variant="primary"
                  icon={<SquarePen />}
                  label="Edit"
                  aria-label="Edit invoice"
                />
              )}
            </div>
          </div>
          {sendResult && (
            <InlineAlert variant={sendResult.ok ? 'success' : 'error'} appearance="plain" className="print:hidden text-sm">
              {sendResult.message}
            </InlineAlert>
          )}
          {stopError && !stopRecurrenceDialogOpen && (
            <InlineAlert variant="error" appearance="plain" className="text-sm print:hidden">
              {stopError}
            </InlineAlert>
          )}
          <Modal open={sendDialogOpen} onClose={() => setSendDialogOpen(false)} title="Send invoice by email">
            <div className="space-y-4">
              <Input
                label="To"
                type="email"
                value={sendToEmail}
                onChange={(e) => setSendToEmail(e.target.value)}
                placeholder="customer@example.com"
              />
              <Textarea
                label="Message (optional)"
                value={sendEmailMessage}
                onChange={(e) => setSendEmailMessage(e.target.value)}
                placeholder="Add a note for your customer…"
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSendEmail} disabled={!sendToEmail.trim()}>Send</Button>
              </div>
            </div>
          </Modal>
          <ConfirmModal
            open={markAsSentDialogOpen}
            onClose={() => setMarkAsSentDialogOpen(false)}
            title="Mark invoice as sent?"
            confirmLabel="Yes, mark as sent"
            cancelLabel="No, keep as draft"
            onConfirm={handleMarkAsSent}
            loading={markingAsSent}
            confirmLoadingLabel="Updating…"
          >
            <p className="text-sm text-gray-700">
              Would you like to mark this invoice as sent? Doing this will prevent editing the invoice again.
            </p>
          </ConfirmModal>
          <ConfirmModal
            open={stopRecurrenceDialogOpen}
            onClose={() => setStopRecurrenceDialogOpen(false)}
            title="Stop recurrence?"
            confirmLabel="Stop recurrence"
            onConfirm={handleStopRecurrence}
            confirmVariant="danger"
            loading={stopping}
            confirmLoadingLabel="Stopping…"
            error={stopError}
          >
            <p className="text-sm text-gray-700">
              This invoice will no longer repeat automatically. No further copies will be scheduled from this recurrence.
            </p>
          </ConfirmModal>
          <div>
            <Card className="print:shadow-none print:border">
              <CardHeader className="flex flex-row justify-between items-start gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">From: {senderLabel(profile, user?.email)}</p>
                  {user?.email && <p className="text-sm text-gray-600">{user.email}</p>}
                  {profile?.tax_id?.trim() && <p className="text-sm text-gray-600">Tax ID: {profile.tax_id.trim()}</p>}
                  <p className="font-medium text-gray-900 mt-2">{customer?.name ?? '—'}</p>
                  {customer?.email && <p className="text-sm text-gray-600">{customer.email}</p>}
                  {customer?.tax_id?.trim() && <p className="text-sm text-gray-600">Tax ID: {customer.tax_id.trim()}</p>}
                  <p className="text-sm text-gray-500">
                    Issue: {formatDate(invoice.issue_date)} · Due: {formatDate(invoice.due_date)}
                  </p>
                  {invoice.is_recurring && (
                    <p className="text-sm text-gray-600 mt-1 print:hidden">
                      {recurrenceLabel(invoice.recurrence_every, invoice.recurrence_unit)}
                      {invoice.next_recurrence_at && (
                        <> · Next: {formatDate(invoice.next_recurrence_at)}</>
                      )}
                    </p>
                  )}
                </div>
                <StatusBadge status={invoice.status} className="print:hidden" />
              </CardHeader>
              <CardContent>
                <table className="w-full text-sm table-fixed">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100">
                      <th className="text-left py-2 font-medium text-gray-700 min-w-0">Description</th>
                      <th className="text-right py-2 pl-4 font-medium text-gray-700 w-16 shrink-0">Qty</th>
                      <th className="text-right py-2 pl-4 font-medium text-gray-700 w-20 shrink-0">Unit</th>
                      <th className="text-right py-2 pl-4 font-medium text-gray-700 w-24 shrink-0">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.lines.map((l) => (
                      <tr key={l.id} className="border-b border-gray-100">
                        <td className="py-2 text-gray-900 min-w-0">{l.description}</td>
                        <td className="py-2 text-right pl-4 w-16 shrink-0 whitespace-nowrap">{l.quantity}</td>
                        <td className="py-2 text-right pl-4 w-20 shrink-0 whitespace-nowrap">${Number(l.unit_price).toFixed(2)}</td>
                        <td className="py-2 text-right pl-4 w-24 shrink-0 whitespace-nowrap">${(l.quantity * l.unit_price).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-right space-y-1">
                  <p className="text-gray-700">Subtotal: ${subtotal.toFixed(2)}</p>
                  {tax > 0 && (
                    <p className="text-gray-700">
                      {invoice.tax_type === 'percent' ? `Tax (${invoice.tax_value}%):` : 'Tax:'} ${tax.toFixed(2)}
                    </p>
                  )}
                  <p className="font-semibold text-gray-900">Total: ${total.toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
            <p className="hidden text-center text-xs text-gray-500 print:fixed print:bottom-6 print:left-0 print:right-0 print:block">
              {INVOICE_BRANDING_LINE}
            </p>
          </div>
        </div>
      </PageScroll>
    </div>
  )
}
