import { Link } from 'react-router-dom'
import { useInvoices } from '../hooks/useInvoices'
import { formatDate } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { recurrenceLabel } from '../lib/recurrence'
import { isNativePlatform } from '../lib/platform/capacitor'
import { LoadingText } from '../components/ui/LoadingText'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
import { InvoiceStatusBadge } from '../components/ui/InvoiceStatusBadge'

export function InvoicesPage() {
  const nativeScrollShell = isNativePlatform()
  const { invoices, isLoading, error } = useInvoices()

  if (isLoading) return <LoadingText>Loading invoices...</LoadingText>
  if (error) return <InlineAlert variant="error" appearance="plain">Error: {error.message}</InlineAlert>

  const recurring = invoices.filter((inv) => inv.is_recurring)
  const regular = invoices.filter((inv) => !inv.is_recurring)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <PageHeading>Invoices</PageHeading>
        <Link to="/invoices/new">
          <Button>New invoice</Button>
        </Link>
      </div>
      <div className={nativeScrollShell ? 'mobile-scroll min-h-0 flex-1' : 'min-h-0 flex-1'}>
        <div className={nativeScrollShell ? 'min-h-[calc(100%+1px)] space-y-4' : 'space-y-4'}>
          {recurring.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Recurring invoices</h3>
              {recurring.map((inv) => {
                const customer = (inv as { customer?: { name: string } }).customer
                return (
                  <Link key={inv.id} to={`/invoices/${inv.id}`} className="block">
                    <Card className="hover:border-gray-300 transition-colors">
                      <CardContent className="p-4 flex flex-row items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">
                            {inv.number_display ?? inv.number} · {customer?.name ?? '—'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {recurrenceLabel(inv.recurrence_every, inv.recurrence_unit)}
                            {inv.next_recurrence_at && (
                              <> · Next: {formatDate(inv.next_recurrence_at)}</>
                            )}
                          </p>
                        </div>
                        <InvoiceStatusBadge status={inv.status} />
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
          {regular.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Invoices</h3>
              {regular.map((inv) => {
                const customer = (inv as { customer?: { name: string } }).customer
                return (
                  <Link key={inv.id} to={`/invoices/${inv.id}`} className="block">
                    <Card className="hover:border-gray-300 transition-colors">
                      <CardContent className="p-4 flex flex-row items-center justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900">{inv.number_display ?? inv.number} · {customer?.name ?? '—'}</p>
                          <p className="text-sm text-gray-500">
                            Due {formatDate(inv.due_date)} · Issue {formatDate(inv.issue_date)}
                          </p>
                        </div>
                        <InvoiceStatusBadge status={inv.status} />
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
          {invoices.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No invoices yet. <Link to="/invoices/new" className="text-gray-900 font-medium hover:underline">Create one</Link>.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
