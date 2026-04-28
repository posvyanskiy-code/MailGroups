import { Button } from 'antd'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { colors } from '../theme'
import { apiScope } from '../auth/msalConfig'

function SignInOut() {
  const { instance, accounts } = useMsal()
  const authed = useIsAuthenticated()
  if (!authed) {
    return (
      <Button type="primary" size="small" onClick={() => instance.loginRedirect({ scopes: [apiScope] })}>
        Sign in
      </Button>
    )
  }
  const name = accounts[0]?.name ?? accounts[0]?.username ?? ''
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 13, color: colors.textMuted }}>{name}</span>
      <button
        onClick={() => instance.logoutRedirect()}
        style={{
          background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
          color: colors.textMuted, fontSize: 13, fontFamily: 'inherit',
        }}
      >
        Sign out
      </button>
    </div>
  )
}

export default function AppHeader() {
  return (
    <header style={{
      background: colors.surfaceRaised,
      borderBottom: `1px solid ${colors.border}`,
      height: 56,
      display: 'flex',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{
        maxWidth: 1080, margin: '0 auto', padding: '0 32px',
        width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{
          fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: colors.text,
        }}>
          Mail Groups
        </span>
        <SignInOut />
      </div>
    </header>
  )
}
