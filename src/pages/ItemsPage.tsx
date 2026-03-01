import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInvoiceItems } from '../hooks/useInvoiceItems'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'

export function ItemsPage() {
  const { items, isLoading, error, remove } = useInvoiceItems()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this item?')) return
    setDeletingId(id)
    try {
      await remove(id)
    } finally {
      setDeletingId(null)
    }
  }

  if (isLoading) return <p className="text-gray-500">Loading items...</p>
  if (error) return <p className="text-red-600">Error: {error.message}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Line items</h2>
        <Link to="/items/new">
          <Button>Add item</Button>
        </Link>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.id}>
            <CardContent className="p-4 flex flex-row items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900">{item.name}</p>
                {item.description && <p className="text-sm text-gray-500 truncate">{item.description}</p>}
                <p className="text-sm text-gray-600">${Number(item.unit_price).toFixed(2)} / unit</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link to={`/items/${item.id}/edit`}>
                  <Button variant="secondary" size="sm">Edit</Button>
                </Link>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {items.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            No items yet. <Link to="/items/new" className="text-gray-900 font-medium hover:underline">Add one</Link> to reuse on invoices.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
