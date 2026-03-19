import type { InvoiceSequence } from '../types/database'

export function formatInvoiceNumber(
  prefix: string,
  length: number,
  suffix: string,
  counter: number
): string {
  const padded = String(counter).padStart(Math.max(1, length), '0')
  return prefix + padded + suffix
}

export function getNextInvoiceCounter(seq: InvoiceSequence | null | undefined): number {
  return (seq?.counter ?? 0) + 1
}

export function formatInvoiceDisplay(
  seq: InvoiceSequence | null | undefined,
  counter: number
): string {
  const prefix = seq?.prefix ?? ''
  const length = seq?.length ?? 1
  const suffix = seq?.suffix ?? ''
  return formatInvoiceNumber(prefix, length, suffix, counter)
}
