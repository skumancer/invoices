import { type ReactNode } from 'react'
import { Button } from './Button'
import { InlineAlert } from './InlineAlert'
import { Modal } from './Modal'

type ConfirmVariant = 'primary' | 'danger'

export interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  confirmVariant?: ConfirmVariant
  loading?: boolean
  /** Shown on the confirm button while `loading` is true */
  confirmLoadingLabel?: string
  error?: string | null
  confirmDisabled?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function ConfirmModal({
  open,
  onClose,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  confirmVariant = 'primary',
  loading = false,
  confirmLoadingLabel,
  error,
  confirmDisabled = false,
  size,
}: ConfirmModalProps) {
  const safeClose = () => {
    if (!loading) onClose()
  }

  return (
    <Modal open={open} onClose={safeClose} title={title} size={size}>
      <div className="space-y-4">
        {children}
        {error ? (
          <InlineAlert variant="error" appearance="plain" className="text-sm">
            {error}
          </InlineAlert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={safeClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
          >
            {loading ? (confirmLoadingLabel ?? 'Working…') : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
