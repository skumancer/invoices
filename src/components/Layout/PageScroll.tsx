import type { ReactNode } from 'react'

type PageScrollProps = {
  children: ReactNode
  className?: string
  innerClassName?: string
}

// Uses normal document scrolling. Kept as a wrapper so pages share one layout entry point.
export function PageScroll({ children, className, innerClassName }: PageScrollProps) {
  const outer = ['min-h-0 flex-1', className]
    .filter(Boolean)
    .join(' ')
  const inner = [innerClassName]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={outer}>
      <div className={inner || undefined}>{children}</div>
    </div>
  )
}
