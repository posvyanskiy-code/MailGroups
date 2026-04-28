import { useEffect, useState } from 'react'
import { Button, Spin, message, Popconfirm, Dropdown } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import type { MailGroup, User, JoinRequest } from '../types'
import { mailGroupService } from '../services'
import { useCurrentUser } from '../context/CurrentUserContext'
import EditGroupModal from '../components/EditGroupModal'
import AddMembersModal from '../components/AddMembersModal'
import { SendMailModal } from '../components/SendMailModal'
import { colors, radii } from '../theme'

type MailHistoryItem = { id: string; subject: string; recipientCount: number; status: string; createdAt: string; sentAt?: string }
type TabKey = 'overview' | 'members' | 'mail' | 'requests'

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
  const [tab, setTab] = useState<TabKey>('overview')

  const loadMailHistory = async (groupId: string) => {
    try { setMailHistory(await mailGroupService.getMailHistory(groupId)) } catch { /* */ }
  }

  const load = async () => {
    if (!id) return
    setLoading(true)
    try {
      const g = await mailGroupService.getGroup(id)
      if (!g) { setGroup(null); setLoading(false); return }
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
      if (isOwnerNow) loadMailHistory(g.id)
    } catch {
      message.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (currentUserId) load() }, [id, currentUserId])

  const handleJoinRequest = async () => {
    if (!group) return
    setSubmitting(true)
    try {
      const req = await mailGroupService.submitJoinRequest(group.id, currentUserId)
      setMyRequest(req)
      message.success('Request submitted')
    } catch { message.error('Failed to submit request') }
    finally { setSubmitting(false) }
  }

  const handleApprove = async (requestId: string) => {
    if (!group) return
    setSubmitting(true)
    try { await mailGroupService.approveJoinRequestInGroup(group.id, requestId); message.success('Approved'); load() }
    catch { message.error('Failed to approve') }
    finally { setSubmitting(false) }
  }

  const handleReject = async (requestId: string) => {
    if (!group) return
    setSubmitting(true)
    try { await mailGroupService.rejectJoinRequestInGroup(group.id, requestId); message.success('Rejected'); load() }
    catch { message.error('Failed to reject') }
    finally { setSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!group) return
    try { await mailGroupService.deleteGroup(group.id); message.success('Group deleted'); navigate('/groups') }
    catch { message.error('Failed to delete group') }
  }

  const handleRemoveMember = async (userId: string) => {
    if (!group) return
    try { await mailGroupService.removeMember(group.id, userId); message.success('Member removed'); load() }
    catch { message.error('Failed to remove member') }
  }

  if (loading) return <div style={{ padding: 96, textAlign: 'center' }}><Spin /></div>
  if (!group) return (
    <div>
      <BackLink onClick={() => navigate('/groups')} />
      <div style={{ padding: '96px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: colors.text }}>Group not found</div>
        <div style={{ marginTop: 6, fontSize: 14, color: colors.textMuted }}>It may be private, or you don't have access.</div>
      </div>
    </div>
  )

  const isMember = group.memberIds.includes(currentUserId)
  const isOwner = group.ownerIds.includes(currentUserId)
  const pendingRequests = requests.filter((r) => r.status === 'pending')
  const showRequestsTab = isOwner && group.visibility === 'Public'

  const tabs: { key: TabKey; label: string; count?: number; show: boolean }[] = [
    { key: 'overview', label: 'Overview', show: true },
    { key: 'members', label: 'Members', count: members.length, show: true },
    { key: 'mail', label: 'Mail history', count: mailHistory.length, show: isOwner },
    { key: 'requests', label: 'Requests', count: pendingRequests.length, show: showRequestsTab },
  ]

  return (
    <div>
      <BackLink onClick={() => navigate('/groups')} />

      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 8 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', color: colors.text }}>
          {group.displayName}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isMember && !myRequest && group.visibility === 'Public' && (
            <Button loading={submitting} onClick={handleJoinRequest}>Request to join</Button>
          )}
          {myRequest && <Pill tone="muted">Request pending</Pill>}
          {isOwner && (
            <>
              <Button type="primary" onClick={() => setComposeOpen(true)}>Compose</Button>
              <Dropdown
                menu={{
                  items: [
                    { key: 'edit', label: 'Edit group', onClick: () => setEditOpen(true) },
                    { key: 'add', label: 'Add members', onClick: () => setAddOpen(true) },
                  ],
                }}
                trigger={['click']}
              >
                <Button>···</Button>
              </Dropdown>
            </>
          )}
        </div>
      </div>

      {/* Subline */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: colors.textMuted, fontSize: 14, marginBottom: 32 }}>
        <span>{group.mail}</span>
        <span style={{ color: colors.textSubtle }}>·</span>
        <span>{group.memberIds.length} {group.memberIds.length === 1 ? 'member' : 'members'}</span>
        <span style={{ color: colors.textSubtle }}>·</span>
        <Pill tone={group.visibility === 'Public' ? 'success' : 'warning'}>{group.visibility}</Pill>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 24, borderBottom: `1px solid ${colors.border}`, marginBottom: 32,
      }}>
        {tabs.filter(t => t.show).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              background: 'transparent', border: 0, padding: '12px 0', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14,
              color: tab === t.key ? colors.text : colors.textMuted,
              fontWeight: tab === t.key ? 600 : 500,
              borderBottom: tab === t.key ? `2px solid ${colors.text}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
            {typeof t.count === 'number' && (
              <span style={{ marginLeft: 6, color: colors.textSubtle, fontWeight: 400 }}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div style={{ maxWidth: 720 }}>
          {group.description && (
            <p style={{ fontSize: 15, color: colors.text, lineHeight: 1.6, margin: '0 0 32px' }}>
              {group.description}
            </p>
          )}
          <DefRow label="Owner" value={owner?.displayName ?? '—'} />
          {group.businessLine && <DefRow label="Business line" value={group.businessLine} />}
          {group.tags.length > 0 && (
            <DefRow label="Tags" value={
              <span>{group.tags.map(t => <span key={t} style={pillStyle()}>{t}</span>)}</span>
            } />
          )}
          <DefRow label="Created" value={new Date(group.createdAt).toLocaleDateString('en-US')} />
          {isOwner && (
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${colors.border}` }}>
              <Popconfirm title="Delete this group?" onConfirm={handleDelete}>
                <Button danger>Delete group</Button>
              </Popconfirm>
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div style={{
          background: colors.surfaceRaised, border: `1px solid ${colors.border}`,
          borderRadius: radii.lg, overflow: 'hidden',
        }}>
          {isOwner && (
            <div style={{
              padding: '14px 20px', borderBottom: `1px solid ${colors.divider}`,
              display: 'flex', justifyContent: 'flex-end',
            }}>
              <Button type="primary" size="small" onClick={() => setAddOpen(true)}>Add members</Button>
            </div>
          )}
          {members.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>
              No members yet.
            </div>
          ) : members.map((u, i) => (
            <div key={u.id} style={{
              padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none',
            }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{u.displayName}</div>
                <div style={{ fontSize: 13, color: colors.textMuted }}>{u.mail}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {group.ownerIds.includes(u.id) && <Pill tone="muted">Owner</Pill>}
                {isOwner && !group.ownerIds.includes(u.id) && (
                  <Popconfirm title="Remove this member?" onConfirm={() => handleRemoveMember(u.id)}>
                    <button style={textBtnStyle()}>Remove</button>
                  </Popconfirm>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'mail' && isOwner && (
        <div style={{
          background: colors.surfaceRaised, border: `1px solid ${colors.border}`,
          borderRadius: radii.lg, overflow: 'hidden',
        }}>
          {mailHistory.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: colors.textMuted }}>No broadcasts yet.</div>
              <Button type="primary" style={{ marginTop: 24 }} onClick={() => setComposeOpen(true)}>Compose</Button>
            </div>
          ) : mailHistory.map((m, i) => (
            <div key={m.id} style={{
              padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{m.subject}</div>
                <div style={{ fontSize: 13, color: colors.textMuted }}>
                  {m.recipientCount} {m.recipientCount === 1 ? 'recipient' : 'recipients'} · {new Date(m.createdAt).toLocaleString('en-US')}
                </div>
              </div>
              <Pill tone={m.status === 'sent' ? 'success' : m.status === 'failed' ? 'danger' : 'muted'}>{m.status}</Pill>
            </div>
          ))}
        </div>
      )}

      {tab === 'requests' && showRequestsTab && (
        <div style={{
          background: colors.surfaceRaised, border: `1px solid ${colors.border}`,
          borderRadius: radii.lg, overflow: 'hidden',
        }}>
          {pendingRequests.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center', color: colors.textMuted, fontSize: 14 }}>
              No pending requests.
            </div>
          ) : pendingRequests.map((req, i) => {
            const r = requesters.find((u) => u.id === req.userId) ?? { displayName: req.userId, mail: '' }
            return (
              <div key={req.id} style={{
                padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                borderTop: i > 0 ? `1px solid ${colors.divider}` : 'none',
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: colors.text }}>{r.displayName}</div>
                  {r.mail && <div style={{ fontSize: 13, color: colors.textMuted }}>{r.mail}</div>}
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => handleReject(req.id)} disabled={submitting} style={textBtnStyle({ color: colors.textMuted })}>Reject</button>
                  <Button type="primary" size="small" loading={submitting} onClick={() => handleApprove(req.id)}>Approve</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isOwner && (
        <>
          <EditGroupModal open={editOpen} group={group} onClose={() => setEditOpen(false)} onSaved={(g) => setGroup(g)} />
          <AddMembersModal open={addOpen} group={group} onClose={() => setAddOpen(false)} onAdded={() => load()} />
          <SendMailModal open={composeOpen} groupId={group.id} onClose={() => setComposeOpen(false)} onSent={() => loadMailHistory(group.id)} />
        </>
      )}
    </div>
  )
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
        color: colors.textMuted, fontSize: 13, fontFamily: 'inherit',
        marginBottom: 16,
      }}
    >
      ← Back to groups
    </button>
  )
}

function DefRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', padding: '12px 0', borderTop: `1px solid ${colors.divider}`, gap: 24,
    }}>
      <div style={{ width: 140, fontSize: 13, color: colors.textMuted }}>{label}</div>
      <div style={{ flex: 1, fontSize: 14, color: colors.text }}>{value}</div>
    </div>
  )
}

function pillStyle(): React.CSSProperties {
  return {
    display: 'inline-block', marginRight: 6, padding: '2px 8px',
    background: colors.surfaceMuted, color: colors.textMuted,
    borderRadius: radii.pill, fontSize: 12,
  }
}

function textBtnStyle(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    background: 'transparent', border: 0, padding: 0, cursor: 'pointer',
    color: colors.text, fontSize: 13, fontFamily: 'inherit', ...extra,
  }
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
