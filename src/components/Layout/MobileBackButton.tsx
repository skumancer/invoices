import { ChevronLeft } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import type { MobileBackTarget } from './useMobileBackTarget'

const backButtonClassName =
  'inline-flex min-w-0 max-w-full items-center gap-0.5 rounded-lg py-1 pr-2 -ml-1 text-blue-600 active:opacity-70'

interface MobileBackButtonProps {
  target: MobileBackTarget
}

export function MobileBackButton({ target }: MobileBackButtonProps) {
  const navigate = useNavigate()

  if ('action' in target) {
    return (
      <button type="button" onClick={() => navigate(-1)} className={backButtonClassName}>
        <ChevronLeft className="size-6 shrink-0" strokeWidth={2.25} aria-hidden />
        <span className="truncate text-base font-normal">{target.label}</span>
      </button>
    )
  }

  return (
    <Link to={target.to} className={backButtonClassName}>
      <ChevronLeft className="size-6 shrink-0" strokeWidth={2.25} aria-hidden />
      <span className="truncate text-base font-normal">{target.label}</span>
    </Link>
  )
}
