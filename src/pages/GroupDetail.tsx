import { useEffect, useState } from 'react'
import {
  Typography, Button, Card, Space, Tag, Avatar, Descriptions,
  List, Spin, message, Popconfirm, Badge, Divider, Empty,
} from 'antd'
import {
  ArrowLeftOutlined, UserOutlined, MailOutlined, LockOutlined, EyeInvisibleOutlined,
  CheckOutlined, CloseOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { MailGroup, User, JoinRequest } from '../types'
import { mailGroupService } from '../services'
import { useCurrentUser } from '../context/CurrentUserContext'

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()

  const [group, setGroup] = useState<MailGroup | null>(null)
  const [owner, setOwner] = useState<User | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [requesters, setRequesters] = useState<User[]>([])
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const g = await mailGroupService.getGroup(id)
      if (!g) { message.error('Рассылка не найдена'); navigate('/groups'); return }
      setGroup(g)
      const [o, m, reqs] = await Promise.all([
        mailGroupService.getUser(g.ownerId),
        mailGroupService.getGroupMembers(id),
        mailGroupService.getJoinRequests(id),
      ])
      const pendingReqs = reqs.filter((r) => r.status === 'pending')
      const requesterUsers = await Promise.all(
        pendingReqs.map((r) => mailGroupService.getUser(r.userId))
      )
      setOwner(o)
      setMembers(m)
      setRequests(reqs)
      setRequesters(requesterUsers.filter((u): u is User => u !== null))
      setMyRequest(reqs.find((r) => r.userId === currentUser.id && r.status === 'pending') ?? null)
    } catch {
      message.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id, currentUser.id])

  const handleJoinRequest = async () => {
    if (!group) return
    setSubmitting(true)
    try {
      const req = await mailGroupService.submitJoinRequest(group.id, currentUser.id)
      setMyRequest(req)
      message.success('Заявка отправлена — ожидайте подтверждения владельца')
    } catch {
      message.error('Не удалось отправить заявку')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    setSubmitting(true)
    try {
      await mailGroupService.approveJoinRequest(requestId)
      message.success('Заявка одобрена')
      load()
    } catch {
      message.error('Ошибка при одобрении заявки')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (requestId: string) => {
    setSubmitting(true)
    try {
      await mailGroupService.rejectJoinRequest(requestId)
      message.success('Заявка отклонена')
      load()
    } catch {
      message.error('Ошибка при отклонении заявки')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!group) return
    try {
      await mailGroupService.deleteGroup(group.id)
      message.success('Рассылка удалена')
      navigate('/groups')
    } catch {
      message.error('Не удалось удалить рассылку')
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />
  if (!group) return null

  const isMember = group.memberIds.includes(currentUser.id)
  const isOwner = group.ownerId === currentUser.id
  const pendingRequests = requests.filter((r) => r.status === 'pending')

  return (
    <div style={{ maxWidth: 800 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')}>Назад</Button>
      </Space>

      {/* Main card */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Space align="center" style={{ marginBottom: 6 }}>
              <Typography.Title level={3} style={{ margin: 0 }}>{group.displayName}</Typography.Title>
              {group.visibility === 'Private' && <Tag icon={<LockOutlined />}>Скрытая</Tag>}
              {group.type === 'dynamic' && <Tag color="blue">Динамическая</Tag>}
              {group.hideFromAddressLists && <Tag icon={<EyeInvisibleOutlined />} color="orange">Скрыта из GAL</Tag>}
            </Space>
            <Typography.Text type="secondary">
              <MailOutlined style={{ marginRight: 6 }} />{group.mail}
            </Typography.Text>
            {group.description && (
              <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0, color: '#555' }}>
                {group.description}
              </Typography.Paragraph>
            )}
          </div>
          <Space direction="vertical" align="end">
            {!isMember && !myRequest && (
              <Button
                type="primary"
                loading={submitting}
                onClick={handleJoinRequest}
              >
                Отправить заявку
              </Button>
            )}
            {myRequest && (
              <Tag color="processing" style={{ padding: '4px 12px' }}>Заявка на рассмотрении</Tag>
            )}
            {isMember && !isOwner && (
              <Tag color="success" style={{ padding: '4px 12px' }}>Вы участник</Tag>
            )}
            {isOwner && (
              <Popconfirm title="Удалить рассылку?" onConfirm={handleDelete}>
                <Button danger size="small">Удалить рассылку</Button>
              </Popconfirm>
            )}
          </Space>
        </div>

        <Divider />

        <Descriptions column={2} size="small">
          {owner && (
            <Descriptions.Item label="Владелец">
              <Space>
                <Avatar size={20} style={{ background: '#0078D4', fontSize: 11 }}>
                  {owner.displayName.slice(0, 1)}
                </Avatar>
                {owner.displayName}
              </Space>
            </Descriptions.Item>
          )}
          {group.businessLine && (
            <Descriptions.Item label="Бизнес-линия">
              <Tag>{group.businessLine}</Tag>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Участников">{group.memberIds.length}</Descriptions.Item>
          <Descriptions.Item label="Создана">
            {new Date(group.createdAt).toLocaleDateString('ru-RU')}
          </Descriptions.Item>
          {group.tags.length > 0 && (
            <Descriptions.Item label="Тэги" span={2}>
              <Space wrap>
                {group.tags.map((t) => <Tag key={t}>{t}</Tag>)}
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Pending requests — только для владельца */}
      {isOwner && pendingRequests.length > 0 && (
        <Card
          title={<Space><span>Заявки на вступление</span><Badge count={pendingRequests.length} color="#0078D4" /></Space>}
          style={{ borderRadius: 12, marginBottom: 16 }}
        >
          <List
            dataSource={pendingRequests}
            renderItem={(req) => {
              const requester = requesters.find((u) => u.id === req.userId) ??
                { displayName: req.userId, id: req.userId, mail: '' }
              return (
                <List.Item
                  actions={[
                    <Button
                      key="approve"
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      loading={submitting}
                      onClick={() => handleApprove(req.id)}
                    >
                      Одобрить
                    </Button>,
                    <Button
                      key="reject"
                      danger
                      size="small"
                      icon={<CloseOutlined />}
                      loading={submitting}
                      onClick={() => handleReject(req.id)}
                    >
                      Отклонить
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} style={{ background: '#0078D4' }} />}
                    title={requester.displayName}
                    description={req.message ?? 'Без сообщения'}
                  />
                </List.Item>
              )
            }}
          />
        </Card>
      )}

      {/* Members list */}
      <Card title={`Участники (${members.length})`} style={{ borderRadius: 12 }}>
        {members.length === 0 ? (
          <Empty description="Нет участников" />
        ) : (
          <List
            dataSource={members}
            renderItem={(u) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    <Avatar style={{ background: '#0078D4' }}>
                      {u.displayName.slice(0, 1)}
                    </Avatar>
                  }
                  title={u.displayName}
                  description={
                    <Space>
                      <span>{u.mail}</span>
                      {u.id === group.ownerId && <Tag color="blue">Владелец</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  )
}
