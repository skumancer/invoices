import { type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Link, type LinkProps } from 'react-router-dom'

type Variant = 'primary' | 'secondary'

const defaultDensity =
  'inline-flex aspect-square size-[5.25rem] shrink-0 flex-col items-center justify-center gap-1 rounded-lg p-2 text-center font-medium text-xs leading-none transition-colors'

const compactDensity =
  'inline-flex aspect-square size-[3.25rem] shrink-0 flex-none flex-col items-center justify-center gap-0.5 rounded-lg p-1.5 text-center font-medium text-[11px] leading-none transition-colors sm:size-[3.5rem] sm:gap-1 sm:p-2 sm:text-xs'

const variantClass: Record<Variant, string> = {
  secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none',
  primary: 'bg-gray-900 text-white border border-transparent hover:bg-gray-800 disabled:opacity-50 disabled:pointer-events-none',
}

const iconBoxDefault = 'flex h-6 w-6 shrink-0 items-center justify-center [&>svg]:h-6 [&>svg]:w-6'
const iconBoxCompact = 'flex h-6 w-6 shrink-0 items-center justify-center sm:h-5 sm:w-5 [&>svg]:h-6 [&>svg]:w-6 sm:[&>svg]:h-5 sm:[&>svg]:w-5'

function classFor(variant: Variant, densityClass: string, className: string) {
  return [densityClass, variantClass[variant], className].filter(Boolean).join(' ')
}

type IconStackButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode
  label: string
  variant?: Variant
  compact?: boolean
}

export function IconStackButton({
  icon,
  label,
  variant = 'secondary',
  compact = false,
  className = '',
  type = 'button',
  ...props
}: IconStackButtonProps) {
  const density = compact ? compactDensity : defaultDensity
  const iconWrap = compact ? iconBoxCompact : iconBoxDefault
  return (
    <button type={type} className={classFor(variant, density, className)} {...props}>
      <span className={iconWrap} aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  )
}

type IconStackLinkProps = LinkProps & {
  icon: ReactNode
  label: string
  variant?: Variant
  compact?: boolean
}

export function IconStackLink({ icon, label, variant = 'primary', compact = false, className = '', ...props }: IconStackLinkProps) {
  const density = compact ? compactDensity : defaultDensity
  const iconWrap = compact ? iconBoxCompact : iconBoxDefault
  return (
    <Link className={classFor(variant, density, className)} {...props}>
      <span className={iconWrap} aria-hidden>
        {icon}
      </span>
      <span>{label}</span>
    </Link>
  )
}
