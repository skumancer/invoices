import { createContext, useContext } from 'react'

export const AssistantModalContext = createContext<() => void>(() => {})

/** Close the assistant popover from any descendant component. */
export function useCloseAssistant(): () => void {
  return useContext(AssistantModalContext)
}
