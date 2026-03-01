import { Link } from 'react-router-dom'
import { useCustomers } from '../hooks/useCustomers'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'

export function CustomersPage() {
  const { customers, isLoading, error } = useCustomers()

  if (isLoading) return <p className="text-gray-500">Loading customers...</p>
  if (error) return <p className="text-red-600">Error: {error.message}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Customers</h2>
        <Link to="/customers/new">
          <Button>Add customer</Button>
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {customers.map((c) => (
          <Link key={c.id} to={`/customers/${c.id}/edit`}>
            <Card className="hover:border-gray-300 transition-colors cursor-pointer h-full">
              <CardContent className="p-4">
                <p className="font-medium text-gray-900">{c.name}</p>
                <p className="text-sm text-gray-500 capitalize">{c.type}</p>
                {c.email && <p className="text-sm text-gray-600 truncate">{c.email}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {customers.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No customers yet. <Link to="/customers/new" className="text-gray-900 font-medium hover:underline">Add one</Link>.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
