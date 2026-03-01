/**
 * Format a YYYY-MM-DD date string for display in the user's locale.
 * Parses as local date to avoid timezone shift (new Date("2025-02-01") is UTC midnight).
 */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString()
}
