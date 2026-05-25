export type SlideDirection = 'forward' | 'back' | 'none'

type RouteSection = 'invoices' | 'customers' | 'items' | 'settings' | 'other'

function getRouteSection(pathname: string): RouteSection {
  if (pathname.startsWith('/invoices')) return 'invoices'
  if (pathname.startsWith('/customers')) return 'customers'
  if (pathname.startsWith('/items')) return 'items'
  if (pathname.startsWith('/settings')) return 'settings'
  return 'other'
}

export function getRouteStackDepth(pathname: string): number {
  if (/^\/(invoices|customers|items|settings)$/.test(pathname)) return 0
  if (/^\/invoices\/[^/]+\/edit$/.test(pathname)) return 2
  if (/^\/(invoices|customers|items)\/new$/.test(pathname)) return 1
  if (/^\/invoices\/[^/]+$/.test(pathname)) return 1
  if (/^\/(customers|items)\/[^/]+\/edit$/.test(pathname)) return 1

  return 0
}

export function getSlideDirection(fromPath: string, toPath: string): SlideDirection {
  if (fromPath === toPath) return 'none'

  const fromSection = getRouteSection(fromPath)
  const toSection = getRouteSection(toPath)
  if (fromSection !== toSection) return 'none'

  const fromDepth = getRouteStackDepth(fromPath)
  const toDepth = getRouteStackDepth(toPath)

  if (fromDepth === toDepth) return 'none'
  if (toDepth > fromDepth) return 'forward'
  return 'back'
}

export const ROUTE_SLIDE_DURATION_MS = 320

export const ROUTE_SLIDE_EASING = 'cubic-bezier(0.32, 0.72, 0, 1)'
