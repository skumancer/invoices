const statusColors = {
  draft: 'bg-gray-100 text-gray-700 ring-gray-200',
  sent: 'bg-blue-100 text-blue-800 ring-blue-200',
  paid: 'bg-green-100 text-green-800 ring-green-200',
  cancelled: 'bg-red-100 text-red-800 ring-red-200',
  production: 'bg-gray-100 text-gray-600 ring-gray-200',
  development: 'bg-orange-100 text-orange-700 ring-orange-200',
} as const

export type StatusKey = keyof typeof statusColors

interface StatusBadgeProps {
  status: StatusKey
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset',
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
