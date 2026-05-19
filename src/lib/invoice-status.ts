import type { InvoiceStatus } from '../types/database'

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  paid: 'Paid',
  cancelled: 'Cancelled',
}

const STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  draft: ['sent', 'paid', 'cancelled'],
  sent: ['paid', 'cancelled'],
  paid: ['cancelled'],
  cancelled: [],
}

export function getAvailableInvoiceStatuses(current: InvoiceStatus): InvoiceStatus[] {
  return STATUS_TRANSITIONS[current]
}

export function statusChangeConfirmTitle(to: InvoiceStatus): string {
  switch (to) {
    case 'cancelled':
      return 'Cancel this invoice?'
    case 'sent':
      return 'Mark invoice as sent?'
    default:
      return `Mark invoice as ${INVOICE_STATUS_LABELS[to].toLowerCase()}?`
  }
}

export function statusChangeConfirmMessage(from: InvoiceStatus, to: InvoiceStatus): string {
  if (to === 'cancelled') {
    return 'This invoice will be voided. You will not be able to edit it again.'
  }
  if (to === 'sent' && from === 'draft') {
    return 'Marking this invoice as sent will prevent editing it again (except for recurring invoices).'
  }
  if (to === 'paid') {
    return 'Mark this invoice as paid? It will be locked for editing.'
  }
  return `Change the invoice status to ${INVOICE_STATUS_LABELS[to].toLowerCase()}?`
}
