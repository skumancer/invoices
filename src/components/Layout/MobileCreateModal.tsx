import { Modal } from '../ui/Modal'
import { CustomerFormPage } from '../../pages/CustomerFormPage'
import { ItemFormPage } from '../../pages/ItemFormPage'
import { InvoiceFormPage } from '../../pages/InvoiceFormPage'
import { useInvalidateData } from '../../contexts/DataInvalidationContext'
import type { MobileCreateKind } from './useMobileNavBar'
import { useMobileCreateModal } from './mobileCreateModalContext'

const createTitles: Record<MobileCreateKind, string> = {
  invoice: 'New invoice',
  customer: 'New customer',
  item: 'New item',
}

export function MobileCreateModal() {
  const { openKind, closeCreate } = useMobileCreateModal()
  const invalidate = useInvalidateData()

  const handleSuccess = () => {
    invalidate()
    closeCreate()
  }

  return (
    <Modal
      open={openKind !== null}
      onClose={closeCreate}
      title={openKind ? createTitles[openKind] : ''}
      size="lg"
    >
      {openKind === 'invoice' ? (
        <InvoiceFormPage key="invoice" variant="modal" onClose={closeCreate} onSuccess={handleSuccess} />
      ) : null}
      {openKind === 'customer' ? (
        <CustomerFormPage key="customer" variant="modal" onClose={closeCreate} onSuccess={handleSuccess} />
      ) : null}
      {openKind === 'item' ? (
        <ItemFormPage key="item" variant="modal" onClose={closeCreate} onSuccess={handleSuccess} />
      ) : null}
    </Modal>
  )
}
