import { useContext } from 'react'
import type { ProfileContextValue } from './profile-context'
import { ProfileContext } from './profile-context'

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider')
  return ctx
}
