import type { ReactNode } from 'react'

interface LoadingTextProps {
  children?: ReactNode
  className?: string
  small?: boolean
  centered?: boolean
}

export function LoadingText({ children = 'Loading...', className = '', small, centered }: LoadingTextProps) {
  const textClass = small ? 'text-sm text-gray-500' : 'text-gray-500'
  const merged = [textClass, className].filter(Boolean).join(' ')
  if (centered) {
    return <p className={`min-h-screen flex items-center justify-center ${merged}`}>{children}</p>
  }
  return <p className={merged}>{children}</p>
}
