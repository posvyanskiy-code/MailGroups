import { useEffect, useState, useMemo } from 'react'
import {
  Typography, Button, Input, Tabs, Select, Space, Card, Avatar,
  Tag, Dropdown, Spin, Empty,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, MoreOutlined, UserOutlined,
  ArrowUpOutlined, ArrowDownOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { MailGroup, User } from '../types'
import { mailGroupService } from '../services'
import { useCurrentUser } from '../context/CurrentUserContext'
import { colors } from '../theme'

type TabKey = 'all' | 'subscriptions' | 'mine' | 'dynamic'
type SortDir = 'asc' | 'desc'

export default function GroupList() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const currentUserId = currentUser?.id ?? ''

  const [groups, setGroups] = useState<MailGroup[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabKey>('all')
  const [filterBL, setFilterBL] = useState<string | null>(null)
  const [filterOwner, setFilterOwner] = useState<string | null>(null)
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const load = async () => {
    setLoading(true)
    const [g, u] = await Promise.all([mailGroupService.getGroups(), mailGroupService.getUsers()])
    setGroups(g)
    setUsers(u)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])

  const businessLines = useMemo(
    () => [...new Set(groups.map((g) => g.businessLine).filter(Boolean))] as string[],
    [groups],
  )
  const allTags = useMemo(() => [...new Set(groups.flatMap((g) => g.tags))], [groups])

  const filtered = useMemo(() => {
    let list = groups

    if (tab === 'subscriptions') list = list.filter((g) => g.memberIds.includes(currentUserId))
    if (tab === 'mine') list = list.filter((g) => g.ownerIds.includes(currentUserId))
    if (tab === 'dynamic') list = list.filter((g) => g.type === 'dynamic')

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (g) =>
          g.displayName.toLowerCase().includes(q) ||
          g.mail.toLowerCase().includes(q) ||
          g.description?.toLowerCase().includes(q) ||
          g.tags.some((t) => t.toLowerCase().includes(q)),
      )
    }

    if (filterBL) list = list.filter((g) => g.businessLine === filterBL)
    if (filterOwner) list = list.filter((g) => g.ownerIds.includes(filterOwner))
    if (filterTag) list = list.filter((g) => g.tags.includes(filterTag))

    return [...list].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? diff : -diff
    })
  }, [groups, tab, search, filterBL, filterOwner, filterTag, sortDir, currentUserId])

  const counts = useMemo(
    () => ({
      all: groups.length,
      subscriptions: groups.filter((g) => g.memberIds.includes(currentUserId)).length,
      mine: groups.filter((g) => g.ownerIds.includes(currentUserId)).length,
      dynamic: groups.filter((g) => g.type === 'dynamic').length,
    }),
    [groups, currentUserId],
  )

  const tabItems = [
    { key: 'all', label: <span>All <Tag style={{ marginLeft: 6 }}>{counts.all}</Tag></span> },
    { key: 'subscriptions', label: <span>My subscriptions <Tag style={{ marginLeft: 6 }}>{counts.subscriptions}</Tag></span> },
    { key: 'mine', label: <span>My groups <Tag style={{ marginLeft: 6 }}>{counts.mine}</Tag></span> },
    { key: 'dynamic', label: <span>Dynamic groups <Tag style={{ marginLeft: 6 }}>{counts.dynamic}</Tag></span> },
  ]

  if (loading) {
    return <Spin size="large" style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <Typography.Title
          level={2}
          style={{ margin: 0, fontWeight: 600, color: colors.text, letterSpacing: '-0.02em' }}
        >
          Mail groups
        </Typography.Title>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => navigate('/groups/new')}
        >
          Create group
        </Button>
      </div>

      {/* Search */}
      <Input
        size="large"
        prefix={<SearchOutlined style={{ color: colors.textMuted }} />}
        placeholder="Search by group name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 28 }}
        allowClear
      />

      {/* Tabs */}
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={tabItems}
        style={{ marginBottom: 20 }}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          placeholder="Business line"
          allowClear
          style={{ minWidth: 170 }}
          value={filterBL}
          onChange={(v) => setFilterBL(v ?? null)}
          options={businessLines.map((bl) => ({ label: bl, value: bl }))}
        />
        <Select
          placeholder="Owner"
          allowClear
          style={{ minWidth: 170 }}
          value={filterOwner}
          onChange={(v) => setFilterOwner(v ?? null)}
          options={users.map((u) => ({ label: u.displayName, value: u.id }))}
        />
        <Select
          placeholder="Tags"
          allowClear
          style={{ minWidth: 150 }}
          value={filterTag}
          onChange={(v) => setFilterTag(v ?? null)}
          options={allTags.map((t) => ({ label: t, value: t }))}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type="text"
            icon={sortDir === 'desc' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            style={{ color: colors.primary }}
          >
            Date {sortDir === 'desc' ? 'descending' : 'ascending'}
          </Button>
        </div>
      </div>

      {/* Group cards */}
      {filtered.length === 0 ? (
        <Empty description="No groups found" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {filtered.map((group) => {
            const owner = userMap.get(group.ownerIds[0] ?? '')
            const isMember = group.memberIds.includes(currentUserId)
            return (
              <Card
                key={group.id}
                hoverable
                className="flat-card"
                onClick={() => navigate(`/groups/${group.id}`)}
                style={{ cursor: 'pointer' }}
                styles={{ body: { padding: '20px 24px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <Typography.Text
                        style={{ fontSize: 16, fontWeight: 600, color: colors.text }}
                      >
                        {group.displayName}
                      </Typography.Text>
                      {group.visibility === 'Private' && (
                        <Tag style={{ fontSize: 11 }}>Private</Tag>
                      )}
                      {group.type === 'dynamic' && (
                        <Tag color="blue" style={{ fontSize: 11 }}>Dynamic</Tag>
                      )}
                    </div>
                    <Typography.Text className="mono" style={{ color: colors.textMuted, display: 'block', marginBottom: 12 }}>
                      {group.mail}
                    </Typography.Text>
                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                      {owner && (
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Owner
                          </Typography.Text>
                          <Space size={8}>
                            <Avatar size={24} style={{ fontSize: 11 }} icon={<UserOutlined />} />
                            <Typography.Text style={{ fontSize: 13 }}>{owner.displayName}</Typography.Text>
                          </Space>
                        </div>
                      )}
                      {group.businessLine && (
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Business line
                          </Typography.Text>
                          <Tag style={{ fontSize: 12 }}>{group.businessLine}</Tag>
                        </div>
                      )}
                    </div>
                  </div>
                  <Space
                    style={{ flexShrink: 0, marginLeft: 16 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isMember && (
                      <Button onClick={() => navigate(`/groups/${group.id}`)}>
                        Request to join
                      </Button>
                    )}
                    {isMember && (
                      <Tag color="success">Member</Tag>
                    )}
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'view', label: 'Open', onClick: () => navigate(`/groups/${group.id}`) },
                          ...(group.ownerIds.includes(currentUserId)
                            ? [{ key: 'delete', label: 'Delete', danger: true }]
                            : []),
                        ],
                      }}
                      trigger={['click']}
                    >
                      <Button type="text" icon={<MoreOutlined />} />
                    </Dropdown>
                  </Space>
                </div>
              </Card>
            )
          })}
        </Space>
      )}
    </div>
  )
}
