import type { RecurrenceUnit } from '../types/database'

export function recurrenceLabel(
  every: number | null,
  unit: RecurrenceUnit | null
): string {
  const n = every && every > 0 ? every : 1
  const resolvedUnit: RecurrenceUnit | null = unit ?? 'months'

  const singular =
    resolvedUnit === 'days'
      ? 'day'
      : resolvedUnit === 'weeks'
        ? 'week'
        : resolvedUnit === 'months'
          ? 'month'
          : 'year'

  const unitLabel = n === 1 ? singular : resolvedUnit
  return `Every ${n} ${unitLabel}`
}

