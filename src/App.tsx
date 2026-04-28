import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import { CurrentUserProvider } from './context/CurrentUserContext'
import AppHeader from './components/AppHeader'
import GroupList from './pages/GroupList'
import GroupCreate from './pages/GroupCreate'
import GroupDetail from './pages/GroupDetail'
import { colors, fonts } from './theme'
import { AuthProvider } from './auth/AuthProvider'

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
          borderRadius: 12,
          fontFamily: fonts.body,
          controlHeight: 40,
        },
        components: {
          Card: { headerBg: 'transparent', boxShadowTertiary: 'none' },
          Tabs: { itemActiveColor: colors.primary, inkBarColor: colors.primary },
          Typography: { titleMarginBottom: '0.4em', titleMarginTop: '0' },
        },
      }}
    >
      <BrowserRouter>
        <CurrentUserProvider>
          <div style={{ minHeight: '100vh', background: colors.surface }}>
            <AppHeader />
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px 64px' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/groups" replace />} />
                <Route path="/groups" element={<GroupList />} />
                <Route path="/groups/new" element={<GroupCreate />} />
                <Route path="/groups/:id" element={<GroupDetail />} />
              </Routes>
            </main>
          </div>
        </CurrentUserProvider>
      </BrowserRouter>
    </ConfigProvider>
    </AuthProvider>
  )
}
