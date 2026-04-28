import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { useEffect, useState, createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { api } from '../services/httpClient'
import type { User } from '../types'

const CurrentUserContext = createContext<User | null>(null)

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const authed = useIsAuthenticated()
  const { accounts } = useMsal()
  const [u, setU] = useState<User | null>(null)

  useEffect(() => {
    if (!authed || !accounts[0]) { setU(null); return }
    api<{ id: string; displayName: string; mail: string }>('/api/me')
      .then(d => setU({ id: d.id, displayName: d.displayName, mail: d.mail }))
      .catch(() => setU(null))
  }, [authed, accounts])

  return <CurrentUserContext.Provider value={u}>{children}</CurrentUserContext.Provider>
}

export function useCurrentUser(): User | null {
  return useContext(CurrentUserContext)
}
