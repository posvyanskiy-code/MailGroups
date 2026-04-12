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

type TabKey = 'all' | 'subscriptions' | 'mine' | 'dynamic'
type SortDir = 'asc' | 'desc'

export default function GroupList() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()

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

    if (tab === 'subscriptions') list = list.filter((g) => g.memberIds.includes(currentUser.id))
    if (tab === 'mine') list = list.filter((g) => g.ownerId === currentUser.id)
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
    if (filterOwner) list = list.filter((g) => g.ownerId === filterOwner)
    if (filterTag) list = list.filter((g) => g.tags.includes(filterTag))

    return [...list].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? diff : -diff
    })
  }, [groups, tab, search, filterBL, filterOwner, filterTag, sortDir, currentUser.id])

  const counts = useMemo(
    () => ({
      all: groups.length,
      subscriptions: groups.filter((g) => g.memberIds.includes(currentUser.id)).length,
      mine: groups.filter((g) => g.ownerId === currentUser.id).length,
      dynamic: groups.filter((g) => g.type === 'dynamic').length,
    }),
    [groups, currentUser.id],
  )

  const tabItems = [
    { key: 'all', label: <span>Все <Tag style={{ marginLeft: 4, fontWeight: 600 }}>{counts.all}</Tag></span> },
    { key: 'subscriptions', label: <span>Мои подписки <Tag style={{ marginLeft: 4 }}>{counts.subscriptions}</Tag></span> },
    { key: 'mine', label: <span>Мои рассылки <Tag style={{ marginLeft: 4 }}>{counts.mine}</Tag></span> },
    { key: 'dynamic', label: <span>Динамические рассылки <Tag style={{ marginLeft: 4 }}>{counts.dynamic}</Tag></span> },
  ]

  if (loading) {
    return <Spin size="large" style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Typography.Title level={2} style={{ margin: 0 }}>Рассылки</Typography.Title>
        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={() => navigate('/groups/new')}
          style={{ borderRadius: 8 }}
        >
          Создать рассылку
        </Button>
      </div>

      {/* Search */}
      <Input
        size="large"
        prefix={<SearchOutlined style={{ color: '#bbb' }} />}
        placeholder="Поиск по названию рассылки"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          marginBottom: 24,
          borderRadius: 10,
          background: '#f5f7fa',
          border: 'none',
          boxShadow: 'none',
        }}
        allowClear
      />

      {/* Tabs */}
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <Select
          placeholder="Бизнес-линия"
          allowClear
          style={{ minWidth: 160 }}
          value={filterBL}
          onChange={(v) => setFilterBL(v ?? null)}
          options={businessLines.map((bl) => ({ label: bl, value: bl }))}
        />
        <Select
          placeholder="Владелец"
          allowClear
          style={{ minWidth: 160 }}
          value={filterOwner}
          onChange={(v) => setFilterOwner(v ?? null)}
          options={users.map((u) => ({ label: u.displayName, value: u.id }))}
        />
        <Select
          placeholder="Тэги"
          allowClear
          style={{ minWidth: 140 }}
          value={filterTag}
          onChange={(v) => setFilterTag(v ?? null)}
          options={allTags.map((t) => ({ label: t, value: t }))}
        />
        <div style={{ marginLeft: 'auto' }}>
          <Button
            type="text"
            icon={sortDir === 'desc' ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            style={{ color: '#0078D4' }}
          >
            Дата по {sortDir === 'desc' ? 'убыванию' : 'возрастанию'}
          </Button>
        </div>
      </div>

      {/* Group cards */}
      {filtered.length === 0 ? (
        <Empty description="Рассылки не найдены" />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          {filtered.map((group) => {
            const owner = userMap.get(group.ownerId)
            const isMember = group.memberIds.includes(currentUser.id)
            return (
              <Card
                key={group.id}
                hoverable
                style={{ borderRadius: 12, border: '1px solid #e8edf3', background: '#fff' }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ marginBottom: 8 }}>
                      <Typography.Link
                        onClick={() => navigate(`/groups/${group.id}`)}
                        style={{ fontSize: 16, fontWeight: 600, color: '#0078D4' }}
                      >
                        {group.displayName}
                      </Typography.Link>
                      {group.visibility === 'Private' && (
                        <Tag color="default" style={{ marginLeft: 8, fontSize: 11 }}>Скрытая</Tag>
                      )}
                      {group.type === 'dynamic' && (
                        <Tag color="blue" style={{ marginLeft: 4, fontSize: 11 }}>Динамическая</Tag>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                      {owner && (
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                            Владелец
                          </Typography.Text>
                          <Space size={6}>
                            <Avatar size={24} style={{ background: '#0078D4', fontSize: 11 }} icon={<UserOutlined />} />
                            <Typography.Text style={{ fontSize: 13 }}>{owner.displayName}</Typography.Text>
                          </Space>
                        </div>
                      )}
                      {group.businessLine && (
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                            Бизнес-линия
                          </Typography.Text>
                          <Tag style={{ fontSize: 13 }}>{group.businessLine}</Tag>
                        </div>
                      )}
                    </div>
                  </div>
                  <Space style={{ flexShrink: 0, marginLeft: 16 }}>
                    {!isMember && (
                      <Button onClick={() => navigate(`/groups/${group.id}`)} style={{ borderRadius: 6 }}>
                        Отправить заявку
                      </Button>
                    )}
                    {isMember && (
                      <Tag color="success" style={{ borderRadius: 6, padding: '2px 10px', margin: 0 }}>
                        Участник
                      </Tag>
                    )}
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'view', label: 'Открыть', onClick: () => navigate(`/groups/${group.id}`) },
                          ...(group.ownerId === currentUser.id
                            ? [{ key: 'delete', label: 'Удалить', danger: true }]
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
