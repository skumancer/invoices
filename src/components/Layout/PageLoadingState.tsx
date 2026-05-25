import type { ReactNode } from 'react'
import { LoadingText } from '../ui/LoadingText'
import { PageScroll } from './PageScroll'

interface PageLoadingStateProps {
  children?: ReactNode
  /** List tab pages use an outer max-width shell; detail/forms use flex + inner max-width. */
  layout?: 'list' | 'content'
}

export function PageLoadingState({ children = 'Loading...', layout = 'list' }: PageLoadingStateProps) {
  const text = <LoadingText>{children}</LoadingText>

  if (layout === 'list') {
    return (
      <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col">
        <PageScroll>{text}</PageScroll>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageScroll>
        <div className="mx-auto w-full max-w-2xl">{text}</div>
      </PageScroll>
    </div>
  )
}
