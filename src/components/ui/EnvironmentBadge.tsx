interface EnvironmentBadgeProps {
  className?: string
}

export function EnvironmentBadge({ className = '' }: EnvironmentBadgeProps) {
  const isProd = import.meta.env.PROD
  const label = isProd ? 'Production' : 'Development'
  const color = isProd
    ? 'bg-gray-100 text-gray-600 ring-gray-200'
    : 'bg-orange-100 text-orange-700 ring-orange-200'

  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset',
        color,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  )
}
