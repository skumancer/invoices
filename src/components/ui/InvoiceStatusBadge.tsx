import type { InvoiceStatus } from '../../types/database'
import { statusColors } from '../../lib/invoice-status'

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus
  className?: string
}

export function InvoiceStatusBadge({ status, className = '' }: InvoiceStatusBadgeProps) {
  return (
    <span
      className={[
        'px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0',
        statusColors[status],
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {status}
    </span>
  )
}
