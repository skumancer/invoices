import type { ReactNode } from 'react'
import { pageTitleClassName } from './typography'

interface PageHeadingProps {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2'
}

export function PageHeading({ children, className = '', as: Tag = 'h2' }: PageHeadingProps) {
  return <Tag className={[pageTitleClassName, className].filter(Boolean).join(' ')}>{children}</Tag>
}
