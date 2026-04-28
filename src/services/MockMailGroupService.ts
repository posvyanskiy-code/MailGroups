import type { IMailGroupService } from './IMailGroupService'
import type { MailGroup, User, JoinRequest, CreateGroupInput } from '../types'

const GROUPS_KEY = 'mg_groups_v2'
const REQUESTS_KEY = 'mg_requests_v2'
const USERS_KEY = 'mg_users_v2'

const DOMAIN = 'company.com'

const SEED_USERS: User[] = [
  { id: 'user-1', displayName: 'Current User', mail: 'current@company.com', jobTitle: 'Product Manager', department: 'Product' },
  { id: 'user-2', displayName: 'Anastasia Popova', mail: 'popova@company.com', jobTitle: 'Head of SME', department: 'SME' },
  { id: 'user-3', displayName: 'Igor Shpigun', mail: 'shpigun@company.com', jobTitle: 'Analyst', department: 'Car Loan' },
  { id: 'user-4', displayName: 'Dmitry Kozlov', mail: 'kozlov@company.com', jobTitle: 'Engineer', department: 'IT' },
  { id: 'user-5', displayName: 'Elena Smirnova', mail: 'smirnova@company.com', jobTitle: 'Marketing Lead', department: 'Marketing' },
]

const SEED_GROUPS: MailGroup[] = []

function loadArr<T>(key: string): T[] {
  const raw = localStorage.getItem(key)
  return raw ? JSON.parse(raw) : []
}

function saveArr<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

export class MockMailGroupService implements IMailGroupService {
  private ensureSeeded() {
    if (!localStorage.getItem(GROUPS_KEY)) {
      saveArr(GROUPS_KEY, SEED_GROUPS)
    }
    if (!localStorage.getItem(USERS_KEY)) {
      saveArr(USERS_KEY, SEED_USERS)
    }
  }

  async getGroups(): Promise<MailGroup[]> {
    this.ensureSeeded()
    return loadArr<MailGroup>(GROUPS_KEY)
  }

  async getGroup(id: string): Promise<MailGroup | null> {
    const groups = await this.getGroups()
    return groups.find((g) => g.id === id) ?? null
  }

  async createGroup(input: CreateGroupInput, ownerId?: string): Promise<MailGroup> {
    const groups = await this.getGroups()
    const now = new Date().toISOString()
    const ownerList = ownerId ? [ownerId] : []
    const group: MailGroup = {
      id: crypto.randomUUID(),
      displayName: input.displayName,
      mailNickname: input.mailNickname,
      mail: `${input.mailNickname}@${DOMAIN}`,
      description: input.description,
      ownerIds: ownerList,
      businessLine: input.businessLine,
      tags: input.tags,
      type: input.type,
      visibility: input.visibility,
      hideFromAddressLists: input.hideFromAddressLists,
      memberIds: ownerList,
      createdAt: now,
      updatedAt: now,
    }
    saveArr(GROUPS_KEY, [...groups, group])
    return group
  }

  async updateGroup(id: string, patch: Partial<Pick<MailGroup, 'displayName' | 'description' | 'businessLine' | 'tags' | 'visibility' | 'hideFromAddressLists'>>): Promise<MailGroup> {
    const groups = await this.getGroups()
    const idx = groups.findIndex((g) => g.id === id)
    if (idx < 0) throw new Error(`Group ${id} not found`)
    groups[idx] = { ...groups[idx], ...patch, updatedAt: new Date().toISOString() }
    saveArr(GROUPS_KEY, groups)
    return groups[idx]
  }

  async deleteGroup(id: string): Promise<void> {
    const groups = await this.getGroups()
    saveArr(GROUPS_KEY, groups.filter((g) => g.id !== id))
  }

  async searchGroups(query: string): Promise<MailGroup[]> {
    const groups = await this.getGroups()
    const q = query.toLowerCase()
    return groups.filter(
      (g) =>
        g.displayName.toLowerCase().includes(q) ||
        g.mail.toLowerCase().includes(q) ||
        g.description?.toLowerCase().includes(q) ||
        g.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    const group = await this.getGroup(groupId)
    if (!group) return []
    const users = await this.getUsers()
    const userMap = new Map(users.map((u) => [u.id, u]))
    return group.memberIds.map(
      (id) => userMap.get(id) ?? { id, displayName: id, mail: `${id}@${DOMAIN}` },
    )
  }

  async addMembers(groupId: string, userIds: string[]): Promise<MailGroup> {
    const groups = await this.getGroups()
    const idx = groups.findIndex((g) => g.id === groupId)
    if (idx < 0) throw new Error(`Group ${groupId} not found`)
    const existing = new Set(groups[idx].memberIds)
    const merged = [...groups[idx].memberIds]
    for (const id of userIds) {
      if (!existing.has(id)) {
        merged.push(id)
        existing.add(id)
      }
    }
    groups[idx] = { ...groups[idx], memberIds: merged, updatedAt: new Date().toISOString() }
    saveArr(GROUPS_KEY, groups)
    return groups[idx]
  }

  async removeMember(groupId: string, userId: string): Promise<MailGroup> {
    const groups = await this.getGroups()
    const idx = groups.findIndex((g) => g.id === groupId)
    if (idx < 0) throw new Error(`Group ${groupId} not found`)
    if (groups[idx].ownerIds.includes(userId)) throw new Error('Cannot remove the group owner')
    groups[idx] = {
      ...groups[idx],
      memberIds: groups[idx].memberIds.filter((id) => id !== userId),
      updatedAt: new Date().toISOString(),
    }
    saveArr(GROUPS_KEY, groups)
    return groups[idx]
  }

  async submitJoinRequest(groupId: string, userId?: string, message?: string): Promise<JoinRequest> {
    const uid = userId ?? 'unknown'
    const requests = loadArr<JoinRequest>(REQUESTS_KEY)
    const existing = requests.find(
      (r) => r.groupId === groupId && r.userId === uid && r.status === 'pending',
    )
    if (existing) return existing
    const req: JoinRequest = {
      id: crypto.randomUUID(),
      groupId,
      userId: uid,
      message,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    saveArr(REQUESTS_KEY, [...requests, req])
    return req
  }

  async getJoinRequests(groupId: string): Promise<JoinRequest[]> {
    return loadArr<JoinRequest>(REQUESTS_KEY).filter((r) => r.groupId === groupId)
  }

  async approveJoinRequest(requestId: string): Promise<void> {
    const requests = loadArr<JoinRequest>(REQUESTS_KEY)
    const req = requests.find((r) => r.id === requestId)
    if (!req) return
    req.status = 'approved'
    saveArr(REQUESTS_KEY, requests)
    const groups = await this.getGroups()
    const idx = groups.findIndex((g) => g.id === req.groupId)
    if (idx >= 0 && !groups[idx].memberIds.includes(req.userId)) {
      groups[idx].memberIds = [...groups[idx].memberIds, req.userId]
      saveArr(GROUPS_KEY, groups)
    }
  }

  async rejectJoinRequest(requestId: string): Promise<void> {
    const requests = loadArr<JoinRequest>(REQUESTS_KEY)
    const req = requests.find((r) => r.id === requestId)
    if (!req) return
    req.status = 'rejected'
    saveArr(REQUESTS_KEY, requests)
  }

  async getMyJoinRequests(userId?: string): Promise<JoinRequest[]> {
    if (!userId) return []
    return loadArr<JoinRequest>(REQUESTS_KEY).filter((r) => r.userId === userId)
  }

  async approveJoinRequestInGroup(_groupId: string, reqId: string): Promise<void> {
    return this.approveJoinRequest(reqId)
  }

  async rejectJoinRequestInGroup(_groupId: string, reqId: string): Promise<void> {
    return this.rejectJoinRequest(reqId)
  }

  async getUsers(): Promise<User[]> {
    this.ensureSeeded()
    return loadArr<User>(USERS_KEY)
  }

  async getUser(id: string): Promise<User | null> {
    const users = await this.getUsers()
    return users.find((u) => u.id === id) ?? null
  }

  async searchUsers(_q: string): Promise<User[]> {
    return []
  }

  async sendMail(_groupId: string, _subject: string, _bodyHtml: string): Promise<void> {
    throw new Error('not implemented in mock')
  }

  async getMailHistory(_groupId: string): Promise<Array<{ id: string; subject: string; recipientCount: number; status: string; createdAt: string; sentAt?: string }>> {
    return []
  }
}
