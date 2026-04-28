import { Avatar, Button, Typography } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { useMsal, useIsAuthenticated } from '@azure/msal-react'
import { useCurrentUser } from '../context/CurrentUserContext'
import { colors } from '../theme'
import { apiScope } from '../auth/msalConfig'

function SignInOut() {
  const { instance, accounts } = useMsal()
  const authed = useIsAuthenticated()
  if (!authed) {
    return (
      <Button type="primary" onClick={() => instance.loginRedirect({ scopes: [apiScope] })}>
        Sign in
      </Button>
    )
  }
  const name = accounts[0]?.name ?? accounts[0]?.username ?? ''
  return (
    <span>
      {name}{' '}
      <Button onClick={() => instance.logoutRedirect()}>Sign out</Button>
    </span>
  )
}

export default function AppHeader() {
  const user = useCurrentUser()

  return (
    <header style={{
      background: colors.surfaceRaised,
      borderBottom: `1px solid ${colors.border}`,
      padding: '0 32px',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MailOutlined style={{ fontSize: 20, color: colors.primary }} />
        <Typography.Text strong style={{ fontSize: 16, color: colors.text, letterSpacing: '-0.01em' }}>
          Mail Groups
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 13, color: colors.textMuted }}>
          {user.displayName}
        </Typography.Text>
        <Avatar size={32} style={{ fontSize: 13, cursor: 'default' }}>
          {user.displayName.slice(0, 1)}
        </Avatar>
        <SignInOut />
      </div>
    </header>
  )
}
