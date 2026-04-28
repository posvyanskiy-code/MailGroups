import { MsalProvider } from '@azure/msal-react';
import { msalInstance } from './msalConfig';
import type { ReactNode } from 'react';

export function AuthProvider({ children }: { children: ReactNode }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
