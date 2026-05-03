import type { ReactNode } from 'react'
import { isNativePlatform } from '../../lib/platform/capacitor'

type PageScrollProps = {
  children: ReactNode
  className?: string
  innerClassName?: string
}

// On native iOS (scrollEnabled: false in capacitor.config) the WKWebView UIScrollView is
// disabled, so internal elements must own their own scroll surface via `mobile-scroll`.
// On web the document scrolls normally; `mobile-scroll` is a no-op there.
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
