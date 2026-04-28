import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Button } from 'antd'
import enUS from 'antd/locale/en_US'
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react'
import { CurrentUserProvider } from './context/CurrentUserContext'
import AppHeader from './components/AppHeader'
import GroupList from './pages/GroupList'
import GroupCreate from './pages/GroupCreate'
import GroupDetail from './pages/GroupDetail'
import { colors, fonts, radii } from './theme'
import { AuthProvider } from './auth/AuthProvider'
import { apiScope } from './auth/msalConfig'

function SignInLanding() {
  const { instance } = useMsal()
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '160px 24px 120px', gap: 24,
    }}>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: colors.text }}>
        Mail Groups
      </div>
      <div style={{ fontSize: 15, color: colors.textMuted, maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
        Manage corporate mail distribution groups. Sign in with your Microsoft account to continue.
      </div>
      <Button type="primary" onClick={() => instance.loginRedirect({ scopes: [apiScope] })}>
        Sign in
      </Button>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
    <ConfigProvider
      locale={enUS}
      theme={{
        token: {
          colorPrimary: colors.primary,
          colorInfo: colors.primary,
          colorSuccess: colors.success,
          colorWarning: colors.warning,
          colorError: colors.danger,
          colorBgLayout: colors.surface,
          colorBgContainer: colors.surfaceRaised,
          colorBgElevated: colors.surfaceRaised,
          colorTextBase: colors.text,
          colorTextSecondary: colors.textMuted,
          colorBorder: colors.border,
          colorBorderSecondary: colors.divider,
          borderRadius: radii.md,
          fontFamily: fonts.body,
          fontSize: 14,
          controlHeight: 36,
          lineHeight: 1.5,
        },
        components: {
          Card: { headerBg: 'transparent', boxShadowTertiary: 'none', borderRadiusLG: radii.lg },
          Tabs: { itemActiveColor: colors.text, inkBarColor: colors.text, itemColor: colors.textMuted, itemHoverColor: colors.text, horizontalItemPadding: '12px 0', horizontalItemGutter: 24 },
          Button: { defaultShadow: 'none', primaryShadow: 'none', controlHeight: 36, fontWeight: 500 },
          Input: { activeShadow: 'none' },
          Tag: { defaultBg: colors.surfaceMuted, defaultColor: colors.textMuted },
          Modal: { headerBg: 'transparent', titleFontSize: 16 },
          Form: { labelColor: colors.text, verticalLabelPadding: '0 0 6px' },
          Typography: { titleMarginBottom: '0.4em', titleMarginTop: '0' },
        },
      }}
    >
      <BrowserRouter>
        <CurrentUserProvider>
          <div style={{ minHeight: '100vh', background: colors.surface }}>
            <AppHeader />
            <main style={{ maxWidth: 1080, margin: '0 auto', padding: '48px 32px 96px' }}>
              <UnauthenticatedTemplate>
                <SignInLanding />
              </UnauthenticatedTemplate>
              <AuthenticatedTemplate>
                <Routes>
                  <Route path="/" element={<Navigate to="/groups" replace />} />
                  <Route path="/groups" element={<GroupList />} />
                  <Route path="/groups/new" element={<GroupCreate />} />
                  <Route path="/groups/:id" element={<GroupDetail />} />
                </Routes>
              </AuthenticatedTemplate>
            </main>
          </div>
        </CurrentUserProvider>
      </BrowserRouter>
    </ConfigProvider>
    </AuthProvider>
  )
}
