import { useParams, Link } from 'react-router-dom'
import { useState, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useInvoice } from '../hooks/useInvoices'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'
import { Card, CardContent, CardHeader } from '../components/ui/Card'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { formatDate } from '../lib/format'
import { buildInvoicePdf } from '../../supabase/functions/_shared/invoice-pdf'

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
  const { invoice, isLoading } = useInvoice(id ?? null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendToEmail, setSendToEmail] = useState('')
  const printRef = useRef<HTMLDivElement>(null)

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
        invNumber: String(invoice.number),
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
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.print()
    }
  }

  const openSendDialog = () => {
    setSendToEmail(invoice?.customer?.email ?? '')
    setSendResult(null)
    setSendDialogOpen(true)
  }

  const handleSendEmail = async () => {
    if (!id || !sendToEmail.trim()) return
    setSending(true)
    setSendResult(null)
    setSendDialogOpen(false)
    const { data, error } = await supabase.functions.invoke('send-invoice-email', {
      body: { invoiceId: id, to: sendToEmail.trim() },
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
  }

  if (!id || isLoading) return <p className="text-gray-500">Loading...</p>
  if (!invoice) return <p className="text-red-600">Invoice not found.</p>

  const customer = invoice.customer
  const { subtotal, tax, total } = computeTotals(
    invoice.lines,
    invoice.tax_type ?? null,
    invoice.tax_value ?? 0
  )
  const isLocked = invoice.status === 'sent' || invoice.status === 'paid'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Invoice #{invoice.number}</h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            Print
          </Button>
          <Button variant="secondary" size="sm" onClick={handleDownloadPdf}>
            Download PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={openSendDialog} disabled={sending}>
            {sending ? 'Sending…' : 'Send by email'}
          </Button>
          {!isLocked && (
            <Link to={`/invoices/${id}/edit`}>
              <Button size="sm">Edit</Button>
            </Link>
          )}
        </div>
      </div>
      {sendResult && (
        <p className={sendResult.ok ? 'text-green-700 text-sm' : 'text-red-600 text-sm'}>{sendResult.message}</p>
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
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSendEmail} disabled={!sendToEmail.trim()}>Send</Button>
          </div>
        </div>
      </Modal>
      <div ref={printRef}>
        <Card className="print:shadow-none print:border">
          <CardHeader>
            <p className="text-sm text-gray-500 mb-1">From: {senderLabel(profile, user?.email)}</p>
            {user?.email && <p className="text-sm text-gray-600">{user.email}</p>}
            {profile?.tax_id?.trim() && <p className="text-sm text-gray-600">Tax ID: {profile.tax_id.trim()}</p>}
            <p className="font-medium text-gray-900 mt-2">{customer?.name ?? '—'}</p>
            {customer?.email && <p className="text-sm text-gray-600">{customer.email}</p>}
            {customer?.tax_id?.trim() && <p className="text-sm text-gray-600">Tax ID: {customer.tax_id.trim()}</p>}
            <p className="text-sm text-gray-500">
              Issue: {formatDate(invoice.issue_date)} · Due: {formatDate(invoice.due_date)}
            </p>
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
      </div>
    </div>
  )
}
