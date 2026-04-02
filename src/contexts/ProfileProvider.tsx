import { type ReactNode } from 'react'
import { useAuth } from './useAuth'
import { useProfile } from '../hooks/useProfile'
import { ProfileContext } from './profile-context'

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const value = useProfile(user?.id ?? undefined)
  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}
