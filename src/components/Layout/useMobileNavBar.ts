import { useLocation } from 'react-router-dom'

export type MobileCreateKind = 'invoice' | 'customer' | 'item'

export interface MobileNavCreateTarget {
  kind: MobileCreateKind
  label: string
  to: string
}

export interface MobileNavBarConfig {
  title: string
  createTarget: MobileNavCreateTarget | null
}

const tabRoots: Record<string, MobileNavBarConfig> = {
  '/invoices': {
    title: 'Invoices',
    createTarget: { kind: 'invoice', label: 'New invoice', to: '/invoices/new' },
  },
  '/customers': {
    title: 'Customers',
    createTarget: { kind: 'customer', label: 'Add customer', to: '/customers/new' },
  },
  '/items': {
    title: 'Items',
    createTarget: { kind: 'item', label: 'Add item', to: '/items/new' },
  },
  '/settings': {
    title: 'Settings',
    createTarget: null,
  },
}

export function useMobileNavBar(): MobileNavBarConfig | null {
  const { pathname } = useLocation()
  return tabRoots[pathname] ?? null
}
