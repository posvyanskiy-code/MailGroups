import { Avatar, Typography } from 'antd'
import { MailOutlined } from '@ant-design/icons'
import { useCurrentUser } from '../context/CurrentUserContext'

export default function AppHeader() {
  const user = useCurrentUser()

  return (
    <header style={{
      background: '#fff',
      borderBottom: '1px solid #e8edf3',
      padding: '0 32px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <MailOutlined style={{ fontSize: 22, color: '#0078D4' }} />
        <Typography.Text strong style={{ fontSize: 16, color: '#0078D4' }}>
          Mail Groups
        </Typography.Text>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {user.displayName}
        </Typography.Text>
        <Avatar
          size={32}
          style={{ background: '#0078D4', fontSize: 13, cursor: 'default' }}
        >
          {user.displayName.slice(0, 1)}
        </Avatar>
      </div>
    </header>
  )
}
