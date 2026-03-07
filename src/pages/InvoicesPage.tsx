import { Link } from 'react-router-dom'
import { useInvoices } from '../hooks/useInvoices'
import { formatDate } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import type { InvoiceStatus } from '../types/database'

const statusColors: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export function InvoicesPage() {
  const { invoices, isLoading, error } = useInvoices()

  if (isLoading) return <p className="text-gray-500">Loading invoices...</p>
  if (error) return <p className="text-red-600">Error: {error.message}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Invoices</h2>
        <Link to="/invoices/new">
          <Button>New invoice</Button>
        </Link>
      </div>
      <div className="space-y-2">
        {invoices.map((inv) => {
          const customer = (inv as { customer?: { name: string } }).customer
          return (
            <Link key={inv.id} to={`/invoices/${inv.id}`} className="block">
              <Card className="hover:border-gray-300 transition-colors">
                <CardContent className="p-4 flex flex-row items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">#{inv.number_display ?? inv.number} · {customer?.name ?? '—'}</p>
                    <p className="text-sm text-gray-500">
                      Due {formatDate(inv.due_date)} · Issue {formatDate(inv.issue_date)}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[inv.status]}`}>
                    {inv.status}
                  </span>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
      {invoices.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No invoices yet. <Link to="/invoices/new" className="text-gray-900 font-medium hover:underline">Create one</Link>.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
