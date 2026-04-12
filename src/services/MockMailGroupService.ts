import type { IMailGroupService } from './IMailGroupService'
import type { MailGroup, User, JoinRequest, CreateGroupInput } from '../types'

const GROUPS_KEY = 'mg_groups'
const REQUESTS_KEY = 'mg_requests'
const USERS_KEY = 'mg_users'

const DOMAIN = 'company.com'

const SEED_USERS: User[] = [
  { id: 'user-1', displayName: 'Текущий Пользователь', mail: 'current@company.com', jobTitle: 'Product Manager', department: 'Product' },
  { id: 'user-2', displayName: 'Попова Анастасия', mail: 'popova@company.com', jobTitle: 'Head of SME', department: 'SME' },
  { id: 'user-3', displayName: 'Шпигун Игорь', mail: 'shpigun@company.com', jobTitle: 'Analyst', department: 'Car Loan' },
  { id: 'user-4', displayName: 'Козлов Дмитрий', mail: 'kozlov@company.com', jobTitle: 'Engineer', department: 'IT' },
  { id: 'user-5', displayName: 'Смирнова Елена', mail: 'smirnova@company.com', jobTitle: 'Marketing Lead', department: 'Marketing' },
]

const SEED_GROUPS: MailGroup[] = [
  {
    id: 'g-1', displayName: 'Проектное финансирование 214-ФЗ', mailNickname: 'pf-214-fz',
    mail: 'pf-214-fz@company.com', description: 'Рассылка по проектному финансированию',
    ownerId: 'user-2', businessLine: 'SME', tags: ['проекты', 'финансирование'],
    type: 'regular', visibility: 'Public', hideFromAddressLists: false,
    memberIds: ['user-2', 'user-3'], createdAt: '2025-11-01T09:00:00Z', updatedAt: '2025-11-01T09:00:00Z',
  },
  {
    id: 'g-2', displayName: 'Отчет по справкам Директ', mailNickname: 'direct-reports',
    mail: 'direct-reports@company.com', description: 'Еженедельные отчёты по Директ',
    ownerId: 'user-3', businessLine: 'Car Loan', tags: ['отчёты', 'директ'],
    type: 'regular', visibility: 'Public', hideFromAddressLists: false,
    memberIds: ['user-3', 'user-4'], createdAt: '2025-10-15T10:00:00Z', updatedAt: '2025-10-15T10:00:00Z',
  },
  {
    id: 'g-3', displayName: 'IT Infrastructure Updates', mailNickname: 'it-infra',
    mail: 'it-infra@company.com', description: 'Обновления инфраструктуры',
    ownerId: 'user-4', businessLine: 'IT', tags: ['IT', 'инфраструктура'],
    type: 'regular', visibility: 'Public', hideFromAddressLists: false,
    memberIds: ['user-1', 'user-4'], createdAt: '2025-09-20T08:00:00Z', updatedAt: '2025-09-20T08:00:00Z',
  },
  {
    id: 'g-4', displayName: 'Marketing Newsletter', mailNickname: 'mktg-news',
    mail: 'mktg-news@company.com',
    ownerId: 'user-5', businessLine: 'Marketing', tags: ['маркетинг'],
    type: 'regular', visibility: 'Private', hideFromAddressLists: false,
    memberIds: ['user-5'], createdAt: '2025-08-10T11:00:00Z', updatedAt: '2025-08-10T11:00:00Z',
  },
  {
    id: 'g-5', displayName: 'All Employees Dynamic', mailNickname: 'all-employees',
    mail: 'all-employees@company.com', description: 'Динамическая рассылка — все сотрудники',
    ownerId: 'user-4', businessLine: 'IT', tags: ['все'],
    type: 'dynamic', visibility: 'Public', hideFromAddressLists: false,
    memberIds: ['user-1', 'user-2', 'user-3', 'user-4', 'user-5'],
    createdAt: '2025-07-01T00:00:00Z', updatedAt: '2025-07-01T00:00:00Z',
  },
  {
    id: 'g-6', displayName: 'Розничный бизнес — анонсы', mailNickname: 'retail-announce',
    mail: 'retail-announce@company.com',
    ownerId: 'user-2', businessLine: 'Retail', tags: ['ритейл', 'анонсы'],
    type: 'regular', visibility: 'Public', hideFromAddressLists: false,
    memberIds: ['user-2'], createdAt: '2025-06-15T09:30:00Z', updatedAt: '2025-06-15T09:30:00Z',
  },
  {
    id: 'g-7', displayName: 'Compliance & Legal', mailNickname: 'compliance',
    mail: 'compliance@company.com', description: 'Скрытая рассылка юридического отдела',
    ownerId: 'user-3', businessLine: 'Legal', tags: ['compliance', 'legal'],
    type: 'regular', visibility: 'Private', hideFromAddressLists: true,
    memberIds: ['user-3'], createdAt: '2025-05-20T14:00:00Z', updatedAt: '2025-05-20T14:00:00Z',
  },
]

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

  async createGroup(input: CreateGroupInput, ownerId: string): Promise<MailGroup> {
    const groups = await this.getGroups()
    const now = new Date().toISOString()
    const group: MailGroup = {
      id: crypto.randomUUID(),
      displayName: input.displayName,
      mailNickname: input.mailNickname,
      mail: `${input.mailNickname}@${DOMAIN}`,
      description: input.description,
      ownerId,
      businessLine: input.businessLine,
      tags: input.tags,
      type: input.type,
      visibility: input.visibility,
      hideFromAddressLists: input.hideFromAddressLists,
      memberIds: [ownerId],
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

  async submitJoinRequest(groupId: string, userId: string, message?: string): Promise<JoinRequest> {
    const requests = loadArr<JoinRequest>(REQUESTS_KEY)
    const existing = requests.find(
      (r) => r.groupId === groupId && r.userId === userId && r.status === 'pending',
    )
    if (existing) return existing
    const req: JoinRequest = {
      id: crypto.randomUUID(),
      groupId,
      userId,
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

  async getMyJoinRequests(userId: string): Promise<JoinRequest[]> {
    return loadArr<JoinRequest>(REQUESTS_KEY).filter((r) => r.userId === userId)
  }

  async getUsers(): Promise<User[]> {
    this.ensureSeeded()
    return loadArr<User>(USERS_KEY)
  }

  async getUser(id: string): Promise<User | null> {
    const users = await this.getUsers()
    return users.find((u) => u.id === id) ?? null
  }
}
