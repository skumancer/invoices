import { createContext, useContext, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { useProfile } from '../hooks/useProfile'

type ProfileContextValue = ReturnType<typeof useProfile>

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const value = useProfile(user?.id ?? undefined)
  return (
    <ProfileContext.Provider value={value}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfileContext(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfileContext must be used within ProfileProvider')
  return ctx
}
