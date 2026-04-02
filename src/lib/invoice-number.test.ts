import { describe, expect, it } from 'vitest'
import {
  formatInvoiceDisplay,
  formatInvoiceNumber,
  getNextInvoiceCounter,
} from './invoice-number'
import type { InvoiceSequence } from '../types/database'

describe('formatInvoiceNumber', () => {
  it('pads counter to length and concatenates', () => {
    expect(formatInvoiceNumber('INV-', 4, '', 7)).toBe('INV-0007')
  })

  it('uses minimum length 1 for padding', () => {
    expect(formatInvoiceNumber('', 0, 'X', 42)).toBe('42X')
  })
})

describe('getNextInvoiceCounter', () => {
  it('returns 1 when sequence is missing', () => {
    expect(getNextInvoiceCounter(null)).toBe(1)
    expect(getNextInvoiceCounter(undefined)).toBe(1)
  })

  it('increments sequence counter', () => {
    const seq = { counter: 5 } as InvoiceSequence
    expect(getNextInvoiceCounter(seq)).toBe(6)
  })
})

describe('formatInvoiceDisplay', () => {
  it('formats with sequence defaults when seq is null', () => {
    expect(formatInvoiceDisplay(null, 3)).toBe('3')
  })

  it('uses prefix, length, suffix from sequence', () => {
    const seq: InvoiceSequence = {
      user_id: 'u',
      prefix: 'ACME-',
      length: 3,
      suffix: '-FY',
      counter: 0,
    }
    expect(formatInvoiceDisplay(seq, 12)).toBe('ACME-012-FY')
  })
})
