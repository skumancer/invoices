import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

const DataInvalidationVersionContext = createContext(0)
const InvalidateDataContext = createContext<() => void>(() => {})

export function DataInvalidationProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const invalidate = useCallback(() => setVersion((v) => v + 1), [])

  return (
    <DataInvalidationVersionContext.Provider value={version}>
      <InvalidateDataContext.Provider value={invalidate}>{children}</InvalidateDataContext.Provider>
    </DataInvalidationVersionContext.Provider>
  )
}

export function useDataInvalidationVersion() {
  return useContext(DataInvalidationVersionContext)
}

export function useInvalidateData() {
  return useContext(InvalidateDataContext)
}
