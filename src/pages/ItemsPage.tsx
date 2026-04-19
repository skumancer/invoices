import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useInvoiceItems } from '../hooks/useInvoiceItems'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { LoadingText } from '../components/ui/LoadingText'
import { InlineAlert } from '../components/ui/InlineAlert'
import { PageHeading } from '../components/ui/PageHeading'
import { isNativePlatform } from '../lib/platform/capacitor'

export function ItemsPage() {
  const nativeScrollShell = isNativePlatform()
  const { items, isLoading, error, remove } = useInvoiceItems()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const openDelete = (id: string) => {
    setDeleteError(null)
    setDeleteId(id)
  }

  const closeDelete = () => {
    setDeleteId(null)
    setDeleteError(null)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await remove(deleteId)
      setDeleteId(null)
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete item')
    } finally {
      setDeleting(false)
    }
  }

  const itemPendingDelete = deleteId ? items.find((i) => i.id === deleteId) : undefined

  if (isLoading) return <LoadingText>Loading items...</LoadingText>
  if (error) return <InlineAlert variant="error" appearance="plain">Error: {error.message}</InlineAlert>

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 items-center justify-between">
        <PageHeading>Line items</PageHeading>
        <Link to="/items/new">
          <Button>Add item</Button>
        </Link>
      </div>
      <div className={nativeScrollShell ? 'mobile-scroll min-h-0 flex-1' : 'min-h-0 flex-1'}>
        <div className={nativeScrollShell ? 'min-h-[calc(100%+1px)] space-y-2' : 'space-y-2'}>
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
                    onClick={() => openDelete(item.id)}
                    disabled={deleting}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {items.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No items yet. <Link to="/items/new" className="text-gray-900 font-medium hover:underline">Add one</Link> to reuse on invoices.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      <ConfirmModal
        open={!!deleteId}
        onClose={closeDelete}
        title="Delete item?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={confirmDelete}
        loading={deleting}
        confirmLoadingLabel="Deleting…"
        error={deleteError}
      >
        <p className="text-sm text-gray-700">
          Delete{' '}
          <span className="font-medium text-gray-900">{itemPendingDelete?.name ?? 'this item'}</span>? This cannot be
          undone.
        </p>
      </ConfirmModal>
    </div>
  )
}
