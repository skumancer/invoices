import { describe, expect, it } from 'vitest'
import {
  getAvailableInvoiceStatuses,
  statusChangeConfirmMessage,
} from './invoice-status'

describe('getAvailableInvoiceStatuses', () => {
  it('returns forward transitions from draft', () => {
    expect(getAvailableInvoiceStatuses('draft')).toEqual(['sent', 'paid', 'cancelled'])
  })

  it('returns paid and cancelled from sent', () => {
    expect(getAvailableInvoiceStatuses('sent')).toEqual(['paid', 'cancelled'])
  })

  it('returns cancelled from paid', () => {
    expect(getAvailableInvoiceStatuses('paid')).toEqual(['cancelled'])
  })

  it('returns none from cancelled', () => {
    expect(getAvailableInvoiceStatuses('cancelled')).toEqual([])
  })
})

describe('statusChangeConfirmMessage', () => {
  it('describes paid transitions', () => {
    expect(statusChangeConfirmMessage('sent', 'paid')).toContain('paid')
  })
})
