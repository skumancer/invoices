import type { ReactNode } from 'react'

const boxed: Record<'error' | 'success', string> = {
  error: 'text-sm text-red-600 bg-red-50 p-2 rounded-lg',
  success: 'text-sm text-green-700 bg-green-50 p-2 rounded-lg',
}

const plain: Record<'error' | 'success', string> = {
  error: 'text-red-600',
  success: 'text-green-700',
}

interface InlineAlertProps {
  variant: 'error' | 'success'
  /** `boxed` = padded banner; `plain` = text color only (e.g. list-level errors) */
  appearance?: 'boxed' | 'plain'
  children: ReactNode
  className?: string
}

export function InlineAlert({ variant, appearance = 'boxed', children, className = '' }: InlineAlertProps) {
  const base = appearance === 'plain' ? plain[variant] : boxed[variant]
  return <p className={[base, className].filter(Boolean).join(' ')}>{children}</p>
}
