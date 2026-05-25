import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { MobileCreateKind } from './useMobileNavBar'

interface MobileCreateModalContextValue {
  openKind: MobileCreateKind | null
  openCreate: (kind: MobileCreateKind) => void
  closeCreate: () => void
}

const MobileCreateModalContext = createContext<MobileCreateModalContextValue | null>(null)

export function MobileCreateModalProvider({ children }: { children: ReactNode }) {
  const [openKind, setOpenKind] = useState<MobileCreateKind | null>(null)

  const openCreate = useCallback((kind: MobileCreateKind) => {
    setOpenKind(kind)
  }, [])

  const closeCreate = useCallback(() => {
    setOpenKind(null)
  }, [])

  const value = useMemo(
    () => ({ openKind, openCreate, closeCreate }),
    [openKind, openCreate, closeCreate]
  )

  return <MobileCreateModalContext.Provider value={value}>{children}</MobileCreateModalContext.Provider>
}

export function useMobileCreateModal() {
  const ctx = useContext(MobileCreateModalContext)
  if (!ctx) {
    throw new Error('useMobileCreateModal must be used within MobileCreateModalProvider')
  }
  return ctx
}
