import { useLayoutEffect, useRef, useState, type ReactNode, type TransitionEvent } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { getSlideDirection, ROUTE_SLIDE_DURATION_MS, type SlideDirection } from './routeSlide'

interface ActiveTransition {
  phase: 'prepare' | 'animate'
  direction: Exclude<SlideDirection, 'none'>
  fromOutlet: ReactNode
}

interface AnimatedOutletProps {
  enabled: boolean
}

export function AnimatedOutlet({ enabled }: AnimatedOutletProps) {
  const location = useLocation()
  const outlet = useOutlet()

  const locationRef = useRef({
    pathname: location.pathname,
    key: location.key,
    outlet,
  })

  const [transition, setTransition] = useState<ActiveTransition | null>(null)
  const finishTimerRef = useRef<number | null>(null)
  const finishingRef = useRef(false)

  const clearFinishTimer = () => {
    if (finishTimerRef.current !== null) {
      window.clearTimeout(finishTimerRef.current)
      finishTimerRef.current = null
    }
  }

  const finishTransition = () => {
    if (finishingRef.current) return
    finishingRef.current = true
    clearFinishTimer()
    requestAnimationFrame(() => {
      setTransition(null)
    })
  }

  useLayoutEffect(() => {
    if (location.key === locationRef.current.key) {
      locationRef.current.outlet = outlet
      return
    }

    finishingRef.current = false

    const direction = getSlideDirection(
      locationRef.current.pathname,
      location.pathname
    )

    const fromOutlet = locationRef.current.outlet

    locationRef.current = {
      pathname: location.pathname,
      key: location.key,
      outlet,
    }

    clearFinishTimer()

    if (direction === 'none') {
      setTransition(null)
      return
    }

    setTransition({
      phase: 'prepare',
      direction,
      fromOutlet,
    })

    const startFrame = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTransition((prev) => (prev?.phase === 'prepare' ? { ...prev, phase: 'animate' } : prev))
      })
    })

    finishTimerRef.current = window.setTimeout(finishTransition, ROUTE_SLIDE_DURATION_MS + 80)

    return () => {
      cancelAnimationFrame(startFrame)
      clearFinishTimer()
    }
  }, [location.key, location.pathname, outlet])

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.propertyName !== 'transform') return
    if (event.currentTarget !== event.target) return
    if (transition?.phase !== 'animate') return
    finishTransition()
  }

  if (!enabled) {
    return outlet
  }

  const isAnimating = transition !== null
  const isForward = transition?.direction === 'forward'
  const isActive = transition?.phase === 'animate'

  const fromLayerClassName = transition
    ? [
        'route-slide-layer',
        isForward ? 'route-slide-layer--under' : 'route-slide-layer--over',
        isForward
          ? isActive
            ? 'route-slide-layer--forward-exit-active'
            : 'route-slide-layer--forward-exit-start'
          : isActive
            ? 'route-slide-layer--back-exit-active'
            : 'route-slide-layer--back-exit-start',
      ].join(' ')
    : ''

  const toLayerClassName = isAnimating
    ? [
        'route-slide-layer',
        isForward ? 'route-slide-layer--over' : 'route-slide-layer--under',
        isForward
          ? isActive
            ? 'route-slide-layer--forward-enter-active'
            : 'route-slide-layer--forward-enter-start'
          : isActive
            ? 'route-slide-layer--back-enter-active'
            : 'route-slide-layer--back-enter-start',
      ].join(' ')
    : 'route-slide-layer route-slide-layer--settled'

  return (
    <div className="route-slide-container">
      {isAnimating ? (
        <div
          className={fromLayerClassName}
          aria-hidden={isForward}
          onTransitionEnd={isForward ? undefined : handleTransitionEnd}
        >
          {transition.fromOutlet}
        </div>
      ) : null}
      <div
        key={location.key}
        className={toLayerClassName}
        onTransitionEnd={isAnimating && isForward ? handleTransitionEnd : undefined}
      >
        {outlet}
      </div>
    </div>
  )
}
