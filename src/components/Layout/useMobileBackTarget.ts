import { useLocation } from 'react-router-dom'

export type MobileBackTarget =
  | { label: string; to: string }
  | { label: string; action: 'back' }

export function useMobileBackTarget(): MobileBackTarget | null {
  const { pathname } = useLocation()

  if (pathname === '/invoices/new') {
    return { label: 'Invoices', to: '/invoices' }
  }

  const invoiceEditMatch = pathname.match(/^\/invoices\/([^/]+)\/edit$/)
  if (invoiceEditMatch) {
    return { label: 'Invoice', to: `/invoices/${invoiceEditMatch[1]}` }
  }

  const invoiceDetailMatch = pathname.match(/^\/invoices\/([^/]+)$/)
  if (invoiceDetailMatch) {
    return { label: 'Invoices', to: '/invoices' }
  }

  if (pathname === '/customers/new') {
    return { label: 'Customers', to: '/customers' }
  }

  if (/^\/customers\/[^/]+\/edit$/.test(pathname)) {
    return { label: 'Customers', to: '/customers' }
  }

  if (pathname === '/items/new') {
    return { label: 'Items', to: '/items' }
  }

  if (/^\/items\/[^/]+\/edit$/.test(pathname)) {
    return { label: 'Items', to: '/items' }
  }

  return null
}
