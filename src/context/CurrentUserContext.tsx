import { createContext, useContext } from 'react'
import type { User } from '../types'

const CURRENT_USER: User = {
  id: 'user-1',
  displayName: 'Current User',
  mail: 'current@company.com',
  jobTitle: 'Product Manager',
  department: 'Product',
}

const CurrentUserContext = createContext<User>(CURRENT_USER)

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserContext.Provider value={CURRENT_USER}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): User {
  return useContext(CurrentUserContext)
}
