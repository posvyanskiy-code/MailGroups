import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import enUS from 'antd/locale/en_US'
import { CurrentUserProvider } from './context/CurrentUserContext'
import AppHeader from './components/AppHeader'
import GroupList from './pages/GroupList'
import GroupCreate from './pages/GroupCreate'
import GroupDetail from './pages/GroupDetail'

export default function App() {
  return (
    <ConfigProvider
      locale={enUS}
      theme={{
        token: {
          colorPrimary: '#0078D4',
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <CurrentUserProvider>
          <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
            <AppHeader />
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
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
  )
}
