export function formatInvoiceNumber(
  prefix: string,
  length: number,
  suffix: string,
  counter: number
): string {
  const padded = String(counter).padStart(Math.max(1, length), '0')
  return prefix + padded + suffix
}
