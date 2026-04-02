import { createContext } from 'react'
import { useProfile } from '../hooks/useProfile'

export type ProfileContextValue = ReturnType<typeof useProfile>

export const ProfileContext = createContext<ProfileContextValue | null>(null)
