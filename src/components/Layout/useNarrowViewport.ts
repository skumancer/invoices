import { useSyncExternalStore } from 'react'

const narrowQuery = '(max-width: 767px)'

/** Matches Tailwind `md` breakpoint (mobile layout + header assistant). */
export function useNarrowViewport(): boolean {
  const subscribe = (onStoreChange: () => void) => {
    const mq = window.matchMedia(narrowQuery)
    const onChange = () => onStoreChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }

  const getSnapshot = () =>
    typeof window !== 'undefined' ? window.matchMedia(narrowQuery).matches : false

  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
