import { useEffect, useState } from 'react'
import {
  Typography, Button, Card, Space, Tag, Avatar, Descriptions,
  List, Spin, message, Popconfirm, Badge, Divider, Empty,
} from 'antd'
import {
  ArrowLeftOutlined, UserOutlined, MailOutlined, LockOutlined, EyeInvisibleOutlined,
  CheckOutlined, CloseOutlined, EditOutlined, UserAddOutlined, DeleteOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { MailGroup, User, JoinRequest } from '../types'
import { mailGroupService } from '../services'
import { useCurrentUser } from '../context/CurrentUserContext'
import EditGroupModal from '../components/EditGroupModal'
import AddMembersModal from '../components/AddMembersModal'
import { SendMailModal } from '../components/SendMailModal'
import { colors } from '../theme'

type MailHistoryItem = { id: string; subject: string; recipientCount: number; status: string; createdAt: string; sentAt?: string }

export default function GroupDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const currentUserId = currentUser?.id ?? ''

  const [group, setGroup] = useState<MailGroup | null>(null)
  const [owner, setOwner] = useState<User | null>(null)
  const [members, setMembers] = useState<User[]>([])
  const [requests, setRequests] = useState<JoinRequest[]>([])
  const [requesters, setRequesters] = useState<User[]>([])
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [mailHistory, setMailHistory] = useState<MailHistoryItem[]>([])

  const loadMailHistory = async (groupId: string) => {
    try {
      const history = await mailGroupService.getMailHistory(groupId)
      setMailHistory(history)
    } catch {
      // non-critical — ignore silently
    }
  }

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const g = await mailGroupService.getGroup(id)
      if (!g) {
        // Group not found or private + non-member: show forbidden state
        setGroup(null)
        setLoading(false)
        return
      }
      setGroup(g)
      const isOwnerNow = !!currentUserId && g.ownerIds.includes(currentUserId)
      const [o, m, reqs] = await Promise.all([
        mailGroupService.getUser(g.ownerIds[0] ?? ''),
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
      setMyRequest(reqs.find((r) => r.userId === currentUserId && r.status === 'pending') ?? null)
      if (isOwnerNow) {
        loadMailHistory(g.id)
      }
    } catch {
      message.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [id, currentUserId])

  const handleJoinRequest = async () => {
    if (!group) return
    setSubmitting(true)
    try {
      const req = await mailGroupService.submitJoinRequest(group.id, currentUserId)
      setMyRequest(req)
      message.success('Request submitted — awaiting owner approval')
    } catch {
      message.error('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    if (!group) return
    setSubmitting(true)
    try {
      await mailGroupService.approveJoinRequestInGroup(group.id, requestId)
      message.success('Request approved')
      load()
    } catch {
      message.error('Failed to approve request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!group) return
    setSubmitting(true)
    try {
      await mailGroupService.rejectJoinRequestInGroup(group.id, requestId)
      message.success('Request rejected')
      load()
    } catch {
      message.error('Failed to reject request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!group) return
    try {
      await mailGroupService.deleteGroup(group.id)
      message.success('Group deleted')
      navigate('/groups')
    } catch {
      message.error('Failed to delete group')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!group) return
    try {
      await mailGroupService.removeMember(group.id, userId)
      message.success('Member removed')
      load()
    } catch {
      message.error('Failed to remove member')
    }
  }

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />
  if (!group) return (
    <div style={{ maxWidth: 800 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')}>Back</Button>
      </Space>
      <Card className="flat-card">
        <Empty description="Group not found or you don't have access" />
      </Card>
    </div>
  )

  const isMember = group.memberIds.includes(currentUserId)
  const isOwner = group.ownerIds.includes(currentUserId)
  const pendingRequests = requests.filter((r) => r.status === 'pending')

  return (
    <div style={{ maxWidth: 800 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')}>Back</Button>
      </Space>

      {/* Main card */}
      <Card className="flat-card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <Space align="center" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
              <Typography.Title
                level={3}
                style={{ margin: 0, fontWeight: 600, color: colors.text, letterSpacing: '-0.01em' }}
              >
                {group.displayName}
              </Typography.Title>
              {group.visibility === 'Private' && <Tag icon={<LockOutlined />}>Private</Tag>}
              {group.type === 'dynamic' && <Tag color="blue">Dynamic</Tag>}
              {group.hideFromAddressLists && <Tag icon={<EyeInvisibleOutlined />} color="orange">Hidden from GAL</Tag>}
            </Space>
            <Typography.Text className="mono" style={{ color: colors.textMuted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <MailOutlined />{group.mail}
            </Typography.Text>
            {group.description && (
              <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0, color: colors.textMuted }}>
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
                Request to join
              </Button>
            )}
            {myRequest && (
              <Tag color="processing" style={{ padding: '4px 12px' }}>Request pending</Tag>
            )}
            {isMember && !isOwner && (
              <Tag color="success" style={{ padding: '4px 12px' }}>You are a member</Tag>
            )}
            {isOwner && (
              <Space>
                <Button icon={<EditOutlined />} size="small" onClick={() => setEditOpen(true)}>
                  Edit
                </Button>
                <Popconfirm title="Delete this group?" onConfirm={handleDelete}>
                  <Button danger size="small">Delete</Button>
                </Popconfirm>
              </Space>
            )}
          </Space>
        </div>

        <Divider />

        <Descriptions column={2} size="small">
          {owner && (
            <Descriptions.Item label="Owner">
              <Space>
                <Avatar size={22} style={{ fontSize: 11 }}>
                  {owner.displayName.slice(0, 1)}
                </Avatar>
                {owner.displayName}
              </Space>
            </Descriptions.Item>
          )}
          {group.businessLine && (
            <Descriptions.Item label="Business line">
              <Tag>{group.businessLine}</Tag>
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Members">{group.memberIds.length}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {new Date(group.createdAt).toLocaleDateString('en-US')}
          </Descriptions.Item>
          {group.tags.length > 0 && (
            <Descriptions.Item label="Tags" span={2}>
              <Space wrap>
                {group.tags.map((t) => <Tag key={t}>{t}</Tag>)}
              </Space>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {/* Pending requests — owner only, only for Public groups */}
      {isOwner && group.visibility === 'Public' && pendingRequests.length > 0 && (
        <Card
          className="flat-card"
          title={<Space><span>Join requests</span><Badge count={pendingRequests.length} color={colors.primary} /></Space>}
          style={{ marginBottom: 20 }}
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
                      Approve
                    </Button>,
                    <Button
                      key="reject"
                      danger
                      size="small"
                      icon={<CloseOutlined />}
                      loading={submitting}
                      onClick={() => handleReject(req.id)}
                    >
                      Reject
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={<UserOutlined />} />}
                    title={requester.displayName}
                    description={req.message ?? 'No message'}
                  />
                </List.Item>
              )
            }}
          />
        </Card>
      )}

      {/* Members list */}
      <Card
        className="flat-card"
        title={`Members (${members.length})`}
        extra={
          isOwner && (
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setAddOpen(true)}>
              Add members
            </Button>
          )
        }
      >
        {members.length === 0 ? (
          <Empty description="No members" />
        ) : (
          <List
            dataSource={members}
            renderItem={(u) => (
              <List.Item
                actions={
                  isOwner && !group.ownerIds.includes(u.id)
                    ? [
                        <Popconfirm
                          key="remove"
                          title="Remove this member?"
                          onConfirm={() => handleRemoveMember(u.id)}
                        >
                          <Button type="text" danger size="small" icon={<DeleteOutlined />} />
                        </Popconfirm>,
                      ]
                    : undefined
                }
              >
                <List.Item.Meta
                  avatar={
                    <Avatar>
                      {u.displayName.slice(0, 1)}
                    </Avatar>
                  }
                  title={u.displayName}
                  description={
                    <Space>
                      <span className="mono">{u.mail}</span>
                      {group.ownerIds.includes(u.id) && <Tag color="blue">Owner</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Compose / mail history — owner only */}
      {isOwner && (
        <Card
          className="flat-card"
          title="Send mail"
          style={{ marginTop: 16 }}
          extra={
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={() => setComposeOpen(true)}
            >
              Compose
            </Button>
          }
        >
          {mailHistory.length === 0 ? (
            <Empty description="No sent messages yet" />
          ) : (
            <List
              dataSource={mailHistory}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={item.subject}
                    description={
                      <Space>
                        <Tag color={item.status === 'sent' ? 'success' : item.status === 'failed' ? 'error' : 'default'}>
                          {item.status}
                        </Tag>
                        <span style={{ color: colors.textMuted, fontSize: 12 }}>
                          {item.recipientCount} recipient{item.recipientCount !== 1 ? 's' : ''}
                        </span>
                        <span style={{ color: colors.textMuted, fontSize: 12 }}>
                          {new Date(item.createdAt).toLocaleString('en-US')}
                        </span>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      )}

      {isOwner && (
        <>
          <EditGroupModal
            open={editOpen}
            group={group}
            onClose={() => setEditOpen(false)}
            onSaved={(g) => setGroup(g)}
          />
          <AddMembersModal
            open={addOpen}
            group={group}
            onClose={() => setAddOpen(false)}
            onAdded={() => load()}
          />
          <SendMailModal
            open={composeOpen}
            groupId={group.id}
            onClose={() => setComposeOpen(false)}
            onSent={() => loadMailHistory(group.id)}
          />
        </>
      )}
    </div>
  )
}
