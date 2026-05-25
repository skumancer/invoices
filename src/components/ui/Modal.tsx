import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { pageTitleClassName } from './typography'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(1rem+env(safe-area-inset-bottom,0px))] pl-[calc(1rem+env(safe-area-inset-left,0px))] pr-[calc(1rem+env(safe-area-inset-right,0px))]"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-lg w-full min-h-0 max-h-full flex flex-col ${sizeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className={pageTitleClassName}>{title}</h2>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">×</Button>
        </div>
        <div className="mobile-scroll min-h-0 flex-1 p-4">{children}</div>
      </div>
    </div>,
    document.body
  )
}
