import { Link } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { LoadingText } from '../components/ui/LoadingText'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
import { PageScroll } from '../components/Layout/PageScroll'

export function CustomersPage() {
  const { customers, isLoading, error } = useCustomers()

  if (isLoading) return <LoadingText>Loading customers...</LoadingText>
  if (error) return <InlineAlert variant="error" appearance="plain">Error: {error.message}</InlineAlert>

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <PageHeading>Customers</PageHeading>
        <Link to="/customers/new">
          <Button>Add customer</Button>
        </Link>
      </div>
      <PageScroll innerClassName="space-y-2">
        {customers.map((c) => (
          <Card key={c.id} className="hover:border-gray-300 transition-colors">
            <CardContent className="p-4 flex flex-row items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-500 capitalize">{c.type}</p>
                {c.email && <p className="text-sm text-gray-600 truncate">{c.email}</p>}
              </div>
              <div className="flex gap-2 shrink-0">
                <Link to={`/customers/${c.id}/edit`}>
                  <Button variant="secondary" size="sm">Edit</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
        {customers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No customers yet. <Link to="/customers/new" className="text-gray-900 font-medium hover:underline">Add one</Link>.
            </CardContent>
          </Card>
        )}
      </PageScroll>
    </div>
  )
}
