import { getPlatform, isNativePlatform } from '../../lib/platform/capacitor'
import { useNarrowViewport } from './useNarrowViewport'

export function useNativeMobileShell() {
  const narrow = useNarrowViewport()
  return isNativePlatform() && narrow
}

export function useNativeIOSShell() {
  const narrow = useNarrowViewport()
  return isNativePlatform() && getPlatform() === 'ios' && narrow
}

export const nativeMobileContentInsetClass = 'px-2'

export const nativeMobileScrollTopClass = 'pt-4'

export const nativeMobileScrollBottomClass =
  'pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))]'
