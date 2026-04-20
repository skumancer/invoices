import type { ReactNode } from 'react'
import { isNativePlatform } from '../../lib/platform/capacitor'

type PageScrollProps = {
  children: ReactNode
  className?: string
  innerClassName?: string
}

// Scrolls on native WebView (where body scroll is locked by AppLayout) and is a no-op on web,
// where the window scrolls. The inner `min-h-[calc(100%+1px)]` forces overscroll so iOS rubber-
// bands correctly even when content fits. The `mobile-scroll` class is also targeted by
// AppLayout to reset scroll position on route change.
export function PageScroll({ children, className, innerClassName }: PageScrollProps) {
  const native = isNativePlatform()
  const outer = [native ? 'mobile-scroll' : '', 'min-h-0 flex-1', className]
    .filter(Boolean)
    .join(' ')
  const inner = [native ? 'min-h-[calc(100%+1px)]' : '', innerClassName]
    .filter(Boolean)
    .join(' ')
  return (
    <div className={outer}>
      <div className={inner || undefined}>{children}</div>
    </div>
  )
}
