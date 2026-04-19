import { Preferences } from '@capacitor/preferences'
import { isNativePlatform } from './capacitor'

type StorageLike = {
  getItem: (key: string) => Promise<string | null>
  setItem: (key: string, value: string) => Promise<void>
  removeItem: (key: string) => Promise<void>
}

const browserStorage: StorageLike = {
  async getItem(key) {
    return localStorage.getItem(key)
  },
  async setItem(key, value) {
    localStorage.setItem(key, value)
  },
  async removeItem(key) {
    localStorage.removeItem(key)
  },
}

const capacitorStorage: StorageLike = {
  async getItem(key) {
    const { value } = await Preferences.get({ key })
    return value ?? null
  },
  async setItem(key, value) {
    await Preferences.set({ key, value })
  },
  async removeItem(key) {
    await Preferences.remove({ key })
  },
}

export function getAuthStorage(): StorageLike {
  if (isNativePlatform()) return capacitorStorage
  return browserStorage
}

export async function clearSupabaseAuthStorage(): Promise<void> {
  try {
    const authTokenKeyPattern = /^sb-.*-auth-token$/

    if (isNativePlatform()) {
      const { keys } = await Preferences.keys()
      await Promise.all(
        keys
          .filter((key) => authTokenKeyPattern.test(key))
          .map((key) => Preferences.remove({ key })),
      )
      return
    }

    const keys = Object.keys(localStorage)
    for (const key of keys) {
      if (authTokenKeyPattern.test(key)) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // Best-effort cleanup; callers should still navigate away.
    // TODO: improve
  }
}
