import { useEffect, useState, useMemo } from 'react'
import { Button, Input, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import type { MailGroup } from '../types'
import { mailGroupService } from '../services'
import { useCurrentUser } from '../context/CurrentUserContext'
import { colors, radii } from '../theme'

type TabKey = 'all' | 'subscriptions' | 'mine'

export default function GroupList() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const currentUserId = currentUser?.id ?? ''

  const [groups, setGroups] = useState<MailGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabKey>('all')

  const load = async () => {
    setLoading(true)
    try {
      const g = await mailGroupService.getGroups()
      setGroups(g)
    } catch {
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!currentUserId) { setLoading(false); return }
    load()
  }, [currentUserId])

  const filtered = useMemo(() => {
    let list = groups
    if (tab === 'subscriptions') list = list.filter((g) => g.memberIds.includes(currentUserId))
    if (tab === 'mine') list = list.filter((g) => g.ownerIds.includes(currentUserId))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (g) => g.displayName.toLowerCase().includes(q) ||
               g.mail.toLowerCase().includes(q) ||
               g.tags.some((t) => t.toLowerCase().includes(q))
      )
    }
    return [...list].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [groups, tab, search, currentUserId])

  const counts = useMemo(() => ({
    all: groups.length,
    subscriptions: groups.filter((g) => g.memberIds.includes(currentUserId)).length,
    mine: groups.filter((g) => g.ownerIds.includes(currentUserId)).length,
  }), [groups, currentUserId])

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: colors.text }}>
            Groups
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: colors.textMuted }}>
            Manage corporate mail distribution groups.
          </p>
        </div>
        <Button type="primary" onClick={() => navigate('/groups/new')}>
          New group
        </Button>
      </div>

      {/* Toolbar: tabs + search */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, marginBottom: 24, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <TabLink active={tab === 'all'} onClick={() => setTab('all')} label="All" count={counts.all} />
          <TabLink active={tab === 'mine'} onClick={() => setTab('mine')} label="My groups" count={counts.mine} />
          <TabLink active={tab === 'subscriptions'} onClick={() => setTab('subscriptions')} label="Subscribed" count={counts.subscriptions} />
        </div>
        <Input
          placeholder="Search groups…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
          allowClear
        />
      </div>

      {/* List */}
      <div style={{
        background: colors.surfaceRaised,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.lg,
        overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 96, textAlign: 'center' }}>
            <Spin />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={search ? 'No groups match your search' : 'No groups yet'}
            hint={search ? 'Try a different keyword.' : 'Create your first distribution group.'}
            cta={!search ? { label: 'New group', onClick: () => navigate('/groups/new') } : undefined}
          />
        ) : (
          filtered.map((g, i) => (
            <GroupRow
              key={g.id}
              group={g}
              isMember={g.memberIds.includes(currentUserId)}
              isOwner={g.ownerIds.includes(currentUserId)}
              divider={i > 0}
              onClick={() => navigate(`/groups/${g.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function TabLink({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 0, padding: '8px 0', cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 14,
        color: active ? colors.text : colors.textMuted,
        fontWeight: active ? 600 : 500,
        borderBottom: active ? `2px solid ${colors.text}` : '2px solid transparent',
        marginBottom: -1,
      }}
    >
      {label}
      <span style={{ marginLeft: 6, color: colors.textSubtle, fontWeight: 400 }}>{count}</span>
    </button>
  )
}

function GroupRow({
  group, isMember, isOwner, divider, onClick,
}: {
  group: MailGroup; isMember: boolean; isOwner: boolean; divider: boolean; onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '20px 24px',
        cursor: 'pointer',
        borderTop: divider ? `1px solid ${colors.divider}` : 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        transition: 'background 80ms ease',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = colors.surfaceMuted)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>{group.displayName}</span>
          <VisibilityBadge value={group.visibility} />
          {isMember && !isOwner && <Pill tone="muted">Member</Pill>}
          {isOwner && <Pill tone="muted">Owner</Pill>}
        </div>
        <div style={{ fontSize: 13, color: colors.textMuted, fontFamily: 'inherit' }}>
          {group.mail}
          {group.tags.length > 0 && (
            <span style={{ marginLeft: 12 }}>
              {group.tags.slice(0, 4).map((t) => (
                <span key={t} style={{
                  display: 'inline-block', marginLeft: 6, padding: '2px 8px',
                  background: colors.surfaceMuted, color: colors.textMuted,
                  borderRadius: radii.pill, fontSize: 12,
                }}>{t}</span>
              ))}
            </span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 13, color: colors.textSubtle, whiteSpace: 'nowrap' }}>
        {group.memberIds.length} {group.memberIds.length === 1 ? 'member' : 'members'}
      </div>
    </div>
  )
}

function VisibilityBadge({ value }: { value: 'Public' | 'Private' }) {
  const isPublic = value === 'Public'
  return (
    <Pill tone={isPublic ? 'success' : 'warning'}>{value}</Pill>
  )
}

function Pill({ tone, children }: { tone: 'success' | 'warning' | 'muted' | 'danger'; children: React.ReactNode }) {
  const map = {
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    muted: { bg: colors.surfaceMuted, fg: colors.textMuted },
  } as const
  const { bg, fg } = map[tone]
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', fontSize: 12,
      borderRadius: radii.pill, background: bg, color: fg, fontWeight: 500,
    }}>{children}</span>
  )
}

function EmptyState({ title, hint, cta }: { title: string; hint?: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div style={{ padding: '96px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>{title}</div>
      {hint && <div style={{ marginTop: 6, fontSize: 14, color: colors.textMuted }}>{hint}</div>}
      {cta && (
        <Button type="primary" style={{ marginTop: 24 }} onClick={cta.onClick}>{cta.label}</Button>
      )}
    </div>
  )
}
