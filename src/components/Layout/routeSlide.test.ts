import { describe, expect, it } from 'vitest'
import { getRouteStackDepth, getSlideDirection } from './routeSlide'

describe('getRouteStackDepth', () => {
  it('returns depth for list and nested routes', () => {
    expect(getRouteStackDepth('/invoices')).toBe(0)
    expect(getRouteStackDepth('/invoices/new')).toBe(1)
    expect(getRouteStackDepth('/invoices/abc')).toBe(1)
    expect(getRouteStackDepth('/invoices/abc/edit')).toBe(2)
    expect(getRouteStackDepth('/settings')).toBe(0)
  })
})

describe('getSlideDirection', () => {
  it('slides forward into detail routes', () => {
    expect(getSlideDirection('/invoices', '/invoices/abc')).toBe('forward')
    expect(getSlideDirection('/customers', '/customers/new')).toBe('forward')
  })

  it('slides back when leaving detail routes', () => {
    expect(getSlideDirection('/invoices/abc', '/invoices')).toBe('back')
    expect(getSlideDirection('/invoices/abc/edit', '/invoices/abc')).toBe('back')
  })

  it('does not slide between tab roots', () => {
    expect(getSlideDirection('/invoices', '/customers')).toBe('none')
    expect(getSlideDirection('/invoices', '/settings')).toBe('none')
    expect(getSlideDirection('/settings', '/items')).toBe('none')
  })
})
