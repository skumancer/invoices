import { useEffect, useState } from 'react'

const narrowQuery = '(max-width: 767px)'

/** Matches Tailwind `md` breakpoint (mobile layout + header assistant). */
export function useNarrowViewport(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(narrowQuery).matches : false,
  )
  useEffect(() => {
    const mq = window.matchMedia(narrowQuery)
    setNarrow(mq.matches)
    const onChange = () => setNarrow(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return narrow
}
