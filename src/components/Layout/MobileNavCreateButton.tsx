import { Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { MobileNavCreateTarget } from './useMobileNavBar'
import { useMobileCreateModal } from './mobileCreateModalContext'
import { useNativeMobileShell } from './useNativeMobileShell'

const createButtonClassName =
  'flex size-11 shrink-0 items-center justify-center rounded-full text-blue-600 transition-opacity active:opacity-70'

interface MobileNavCreateButtonProps {
  target: MobileNavCreateTarget
}

export function MobileNavCreateButton({ target }: MobileNavCreateButtonProps) {
  const nativeMobile = useNativeMobileShell()
  const { openCreate } = useMobileCreateModal()

  if (nativeMobile) {
    return (
      <button
        type="button"
        aria-label={target.label}
        className={createButtonClassName}
        onClick={() => openCreate(target.kind)}
      >
        <Plus className="size-6" strokeWidth={2.25} aria-hidden />
      </button>
    )
  }

  return (
    <Link to={target.to} aria-label={target.label} className={createButtonClassName}>
      <Plus className="size-6" strokeWidth={2.25} aria-hidden />
    </Link>
  )
}
