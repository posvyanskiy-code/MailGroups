import { useEffect, useState } from 'react'
import {
  Typography, Button, Card, Space, Tag, Avatar, Descriptions,
  List, Spin, message, Popconfirm, Badge, Divider, Empty,
} from 'antd'
import {
  ArrowLeftOutlined, UserOutlined, MailOutlined, LockOutlined, EyeInvisibleOutlined,
  CheckOutlined, CloseOutlined, EditOutlined, UserAddOutlined, DeleteOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import type { MailGroup, User, JoinRequest } from '../types'
import { mailGroupService } from '../services'
import { useCurrentUser } from '../context/CurrentUserContext'
import EditGroupModal from '../components/EditGroupModal'
import AddMembersModal from '../components/AddMembersModal'

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
  const [editOpen, setEditOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const g = await mailGroupService.getGroup(id)
      if (!g) { message.error('Group not found'); navigate('/groups'); return }
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
      message.error('Failed to load data')
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
      message.success('Request submitted — awaiting owner approval')
    } catch {
      message.error('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async (requestId: string) => {
    setSubmitting(true)
    try {
      await mailGroupService.approveJoinRequest(requestId)
      message.success('Request approved')
      load()
    } catch {
      message.error('Failed to approve request')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async (requestId: string) => {
    setSubmitting(true)
    try {
      await mailGroupService.rejectJoinRequest(requestId)
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
  if (!group) return null

  const isMember = group.memberIds.includes(currentUser.id)
  const isOwner = group.ownerId === currentUser.id
  const pendingRequests = requests.filter((r) => r.status === 'pending')

  return (
    <div style={{ maxWidth: 800 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')}>Back</Button>
      </Space>

      {/* Main card */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Space align="center" style={{ marginBottom: 6 }}>
              <Typography.Title level={3} style={{ margin: 0 }}>{group.displayName}</Typography.Title>
              {group.visibility === 'Private' && <Tag icon={<LockOutlined />}>Private</Tag>}
              {group.type === 'dynamic' && <Tag color="blue">Dynamic</Tag>}
              {group.hideFromAddressLists && <Tag icon={<EyeInvisibleOutlined />} color="orange">Hidden from GAL</Tag>}
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
                <Avatar size={20} style={{ background: '#0078D4', fontSize: 11 }}>
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

      {/* Pending requests — только для владельца */}
      {isOwner && pendingRequests.length > 0 && (
        <Card
          title={<Space><span>Join requests</span><Badge count={pendingRequests.length} color="#0078D4" /></Space>}
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
                    avatar={<Avatar icon={<UserOutlined />} style={{ background: '#0078D4' }} />}
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
        title={`Members (${members.length})`}
        style={{ borderRadius: 12 }}
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
                  isOwner && u.id !== group.ownerId
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
                    <Avatar style={{ background: '#0078D4' }}>
                      {u.displayName.slice(0, 1)}
                    </Avatar>
                  }
                  title={u.displayName}
                  description={
                    <Space>
                      <span>{u.mail}</span>
                      {u.id === group.ownerId && <Tag color="blue">Owner</Tag>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

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
        </>
      )}
    </div>
  )
}
