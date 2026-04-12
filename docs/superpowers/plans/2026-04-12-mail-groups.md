# Mail Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** SPA для управления почтовыми рассылками — создание, поиск, просмотр, вступление по заявке — с мок-адаптером Microsoft Graph API.

**Architecture:** React SPA без бэкенда; данные в localStorage через `MockMailGroupService`, реализующий интерфейс `IMailGroupService` (готов к замене на реальный Graph API). Текущий пользователь захардкожен как мок. Маршрутизация через React Router v7.

**Tech Stack:** React 18, TypeScript, Vite, Ant Design v6, React Router v7, Vitest

---

## File Map

| Действие | Файл | Назначение |
|---|---|---|
| Create | `vite.config.ts` | Vite + Vitest config |
| Create | `src/types/index.ts` | MailGroup, User, JoinRequest |
| Create | `src/services/IMailGroupService.ts` | Интерфейс Graph-адаптера |
| Create | `src/services/MockMailGroupService.ts` | localStorage мок |
| Create | `src/services/MockMailGroupService.test.ts` | Тесты сервиса |
| Create | `src/services/index.ts` | Экспорт активного сервиса |
| Create | `src/context/CurrentUserContext.tsx` | Мок текущего пользователя |
| Create | `src/components/AppHeader.tsx` | Топ-бар |
| Create | `src/pages/GroupList.tsx` | Список с поиском/табами/фильтрами |
| Create | `src/pages/GroupCreate.tsx` | Форма создания рассылки |
| Create | `src/pages/GroupDetail.tsx` | Детальная страница + заявка |
| Create | `src/App.tsx` | Роуты |
| Create | `src/main.tsx` | Точка входа |
| Create | `src/index.css` | Глобальные стили |

---

## Task 1: Project scaffold

**Files:**
- Create: `vite.config.ts`
- Create: `package.json` (via npm)
- Create: `src/index.css`

- [ ] **Step 1: Создать Vite проект**

```bash
cd /Users/vladimir.posvyanskiy/ClaudeProjects/MailGroups
npm create vite@latest . -- --template react-ts
```

Ответить `y` на вопрос об удалении файлов если спросит.

- [ ] **Step 2: Установить зависимости**

```bash
npm install antd react-router-dom
npm install -D vitest jsdom @vitest/ui
```

- [ ] **Step 3: Заменить `vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Добавить тестовый скрипт в `package.json`**

Найти секцию `"scripts"` и добавить строку:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Заменить `src/index.css`**

```css
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: #f0f4f8;
  min-height: 100vh;
}
```

- [ ] **Step 6: Проверить сборку**

```bash
npm run build
```

Ожидание: `✓ built` без ошибок.

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "chore: scaffold Vite + React + TS + Ant Design + Vitest"
```

---

## Task 2: Типы + интерфейс сервиса

**Files:**
- Create: `src/types/index.ts`
- Create: `src/services/IMailGroupService.ts`

- [ ] **Step 1: Создать `src/types/index.ts`**

```typescript
export interface User {
  id: string;
  displayName: string;
  mail: string;
  jobTitle?: string;
  department?: string;
  avatarUrl?: string;
}

export type GroupType = 'regular' | 'dynamic';
export type GroupVisibility = 'Public' | 'Private';

export interface MailGroup {
  id: string;
  displayName: string;
  mailNickname: string;       // часть адреса до @
  mail: string;               // полный email рассылки
  description?: string;
  ownerId: string;
  businessLine?: string;
  tags: string[];
  type: GroupType;
  visibility: GroupVisibility;
  hideFromAddressLists: boolean;  // скрыта из глобального адресника M365
  memberIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface JoinRequest {
  id: string;
  groupId: string;
  userId: string;
  message?: string;
  status: JoinRequestStatus;
  createdAt: string;
}

export interface CreateGroupInput {
  displayName: string;
  mailNickname: string;
  description?: string;
  businessLine?: string;
  tags: string[];
  type: GroupType;
  visibility: GroupVisibility;
  hideFromAddressLists: boolean;
}
```

- [ ] **Step 2: Создать `src/services/IMailGroupService.ts`**

```typescript
import type { MailGroup, User, JoinRequest, CreateGroupInput } from '../types';

export interface IMailGroupService {
  // Groups
  getGroups(): Promise<MailGroup[]>;
  getGroup(id: string): Promise<MailGroup | null>;
  createGroup(input: CreateGroupInput, ownerId: string): Promise<MailGroup>;
  updateGroup(id: string, patch: Partial<Pick<MailGroup, 'displayName' | 'description' | 'businessLine' | 'tags' | 'visibility' | 'hideFromAddressLists'>>): Promise<MailGroup>;
  deleteGroup(id: string): Promise<void>;
  searchGroups(query: string): Promise<MailGroup[]>;

  // Members
  getGroupMembers(groupId: string): Promise<User[]>;

  // Join requests
  submitJoinRequest(groupId: string, userId: string, message?: string): Promise<JoinRequest>;
  getJoinRequests(groupId: string): Promise<JoinRequest[]>;
  approveJoinRequest(requestId: string): Promise<void>;
  rejectJoinRequest(requestId: string): Promise<void>;
  getMyJoinRequests(userId: string): Promise<JoinRequest[]>;

  // Users (для пикера)
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | null>;
}
```

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

Ожидание: `✓ built` без ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/services/IMailGroupService.ts
git commit -m "feat: add domain types and IMailGroupService interface"
```

---

## Task 3: MockMailGroupService + тесты + seed-данные

**Files:**
- Create: `src/services/MockMailGroupService.ts`
- Create: `src/services/MockMailGroupService.test.ts`
- Create: `src/services/index.ts`

- [ ] **Step 1: Написать тесты (TDD — сначала тесты)**

Создать `src/services/MockMailGroupService.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MockMailGroupService } from './MockMailGroupService'

// jsdom localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v },
    removeItem: (k: string) => { delete store[k] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(global, 'localStorage', { value: localStorageMock })

describe('MockMailGroupService', () => {
  let svc: MockMailGroupService

  beforeEach(() => {
    localStorage.clear()
    svc = new MockMailGroupService()
  })

  it('returns seeded groups on first load', async () => {
    const groups = await svc.getGroups()
    expect(groups.length).toBeGreaterThan(0)
  })

  it('creates a group and returns it with generated mail', async () => {
    const group = await svc.createGroup(
      {
        displayName: 'Test Group',
        mailNickname: 'test-group',
        description: 'desc',
        businessLine: 'SME',
        tags: ['test'],
        type: 'regular',
        visibility: 'Public',
        hideFromAddressLists: false,
      },
      'user-1',
    )
    expect(group.mail).toBe('test-group@company.com')
    expect(group.ownerId).toBe('user-1')
    expect(group.memberIds).toContain('user-1')

    const all = await svc.getGroups()
    expect(all.find((g) => g.id === group.id)).toBeTruthy()
  })

  it('searchGroups filters by displayName case-insensitive', async () => {
    await svc.createGroup(
      { displayName: 'Marketing Weekly', mailNickname: 'mktg', tags: [], type: 'regular', visibility: 'Public', hideFromAddressLists: false },
      'user-1',
    )
    const results = await svc.searchGroups('marketing')
    expect(results.some((g) => g.displayName === 'Marketing Weekly')).toBe(true)
  })

  it('submitJoinRequest creates a pending request', async () => {
    const groups = await svc.getGroups()
    const group = groups[0]
    const req = await svc.submitJoinRequest(group.id, 'user-99')
    expect(req.status).toBe('pending')
    expect(req.groupId).toBe(group.id)
    expect(req.userId).toBe('user-99')
  })

  it('approveJoinRequest adds user to members', async () => {
    const groups = await svc.getGroups()
    const group = groups[0]
    const req = await svc.submitJoinRequest(group.id, 'user-99')
    await svc.approveJoinRequest(req.id)
    const members = await svc.getGroupMembers(group.id)
    expect(members.some((m) => m.id === 'user-99')).toBe(true)
  })
})
```

- [ ] **Step 2: Запустить тесты — убедиться что падают**

```bash
npm run test
```

Ожидание: FAIL — `MockMailGroupService` не существует.

- [ ] **Step 3: Создать `src/services/MockMailGroupService.ts`**

```typescript
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
    return users.filter((u) => group.memberIds.includes(u.id))
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
    // Add user to group members
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
```

- [ ] **Step 4: Создать `src/services/index.ts`**

```typescript
import { MockMailGroupService } from './MockMailGroupService'
import type { IMailGroupService } from './IMailGroupService'

export const mailGroupService: IMailGroupService = new MockMailGroupService()
```

- [ ] **Step 5: Запустить тесты — убедиться что проходят**

```bash
npm run test
```

Ожидание: 5/5 PASS.

- [ ] **Step 6: Commit**

```bash
git add src/services/ 
git commit -m "feat: MockMailGroupService with seed data and tests"
```

---

## Task 4: CurrentUserContext + App shell

**Files:**
- Create: `src/context/CurrentUserContext.tsx`
- Create: `src/components/AppHeader.tsx`
- Create: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: Создать `src/context/CurrentUserContext.tsx`**

```tsx
import { createContext, useContext } from 'react'
import type { User } from '../types'

// Мок текущего пользователя — заменить на реальный SSO при интеграции
const CURRENT_USER: User = {
  id: 'user-1',
  displayName: 'Текущий Пользователь',
  mail: 'current@company.com',
  jobTitle: 'Product Manager',
  department: 'Product',
}

const CurrentUserContext = createContext<User>(CURRENT_USER)

export function CurrentUserProvider({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserContext.Provider value={CURRENT_USER}>
      {children}
    </CurrentUserContext.Provider>
  )
}

export function useCurrentUser(): User {
  return useContext(CurrentUserContext)
}
```

- [ ] **Step 2: Создать `src/components/AppHeader.tsx`**

```tsx
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
```

- [ ] **Step 3: Создать `src/App.tsx`**

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import ruRU from 'antd/locale/ru_RU'
import { CurrentUserProvider } from './context/CurrentUserContext'
import AppHeader from './components/AppHeader'
import GroupList from './pages/GroupList'
import GroupCreate from './pages/GroupCreate'
import GroupDetail from './pages/GroupDetail'

export default function App() {
  return (
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: '#0078D4',
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <CurrentUserProvider>
          <div style={{ minHeight: '100vh', background: '#f0f4f8' }}>
            <AppHeader />
            <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
              <Routes>
                <Route path="/" element={<Navigate to="/groups" replace />} />
                <Route path="/groups" element={<GroupList />} />
                <Route path="/groups/new" element={<GroupCreate />} />
                <Route path="/groups/:id" element={<GroupDetail />} />
              </Routes>
            </main>
          </div>
        </CurrentUserProvider>
      </BrowserRouter>
    </ConfigProvider>
  )
}
```

- [ ] **Step 4: Заменить `src/main.tsx`**

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 5: Проверить сборку**

```bash
npm run build
```

Ожидание: `✓ built` без ошибок.

- [ ] **Step 6: Commit**

```bash
git add src/context/ src/components/AppHeader.tsx src/App.tsx src/main.tsx
git commit -m "feat: app shell with header, routing, CurrentUserContext"
```

---

## Task 5: GroupList — главная страница

**Files:**
- Create: `src/pages/GroupList.tsx`

- [ ] **Step 1: Создать `src/pages/GroupList.tsx`**

```tsx
import { useEffect, useState, useMemo } from 'react'
import {
  Typography, Button, Input, Tabs, Select, Space, Card, Avatar,
  Tag, Dropdown, Spin, Empty,
} from 'antd'
import {
  PlusOutlined, SearchOutlined, MoreOutlined, UserOutlined, ArrowUpOutlined, ArrowDownOutlined,
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

  const businessLines = useMemo(() => [...new Set(groups.map((g) => g.businessLine).filter(Boolean))] as string[], [groups])
  const allTags = useMemo(() => [...new Set(groups.flatMap((g) => g.tags))], [groups])

  const filtered = useMemo(() => {
    let list = groups

    // Tab filter
    if (tab === 'subscriptions') list = list.filter((g) => g.memberIds.includes(currentUser.id))
    if (tab === 'mine') list = list.filter((g) => g.ownerId === currentUser.id)
    if (tab === 'dynamic') list = list.filter((g) => g.type === 'dynamic')

    // Search
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

    // Filters
    if (filterBL) list = list.filter((g) => g.businessLine === filterBL)
    if (filterOwner) list = list.filter((g) => g.ownerId === filterOwner)
    if (filterTag) list = list.filter((g) => g.tags.includes(filterTag))

    // Sort by createdAt
    list = [...list].sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      return sortDir === 'asc' ? diff : -diff
    })

    return list
  }, [groups, tab, search, filterBL, filterOwner, filterTag, sortDir, currentUser.id])

  const counts = useMemo(() => ({
    all: groups.length,
    subscriptions: groups.filter((g) => g.memberIds.includes(currentUser.id)).length,
    mine: groups.filter((g) => g.ownerId === currentUser.id).length,
    dynamic: groups.filter((g) => g.type === 'dynamic').length,
  }), [groups, currentUser.id])

  const tabItems = [
    { key: 'all', label: <span>Все <Tag style={{ marginLeft: 4 }}>{counts.all}</Tag></span> },
    { key: 'subscriptions', label: <span>Мои подписки <Tag style={{ marginLeft: 4 }}>{counts.subscriptions}</Tag></span> },
    { key: 'mine', label: <span>Мои рассылки <Tag style={{ marginLeft: 4 }}>{counts.mine}</Tag></span> },
    { key: 'dynamic', label: <span>Динамические рассылки <Tag style={{ marginLeft: 4 }}>{counts.dynamic}</Tag></span> },
  ]

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />

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
        style={{ marginBottom: 24, borderRadius: 10, background: '#f5f7fa', border: 'none' }}
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
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <Select
          placeholder={`Бизнес-линия${filterBL ? '' : ' 0'}`}
          allowClear
          style={{ minWidth: 160 }}
          value={filterBL}
          onChange={(v) => setFilterBL(v ?? null)}
          options={businessLines.map((bl) => ({ label: bl, value: bl }))}
        />
        <Select
          placeholder={`Владелец${filterOwner ? '' : ' 0'}`}
          allowClear
          style={{ minWidth: 160 }}
          value={filterOwner}
          onChange={(v) => setFilterOwner(v ?? null)}
          options={users.map((u) => ({ label: u.displayName, value: u.id }))}
        />
        <Select
          placeholder={`Тэги${filterTag ? '' : ' 0'}`}
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
            onClick={() => setSortDir((d) => d === 'desc' ? 'asc' : 'desc')}
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
                style={{ borderRadius: 12, border: '1px solid #e8edf3' }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
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
                    <div style={{ display: 'flex', gap: 32, marginTop: 10 }}>
                      {owner && (
                        <div>
                          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                            Владелец
                          </Typography.Text>
                          <Space size={6}>
                            <Avatar size={24} style={{ background: '#0078D4', fontSize: 11 }} icon={<UserOutlined />}>
                              {owner.displayName.slice(0, 1)}
                            </Avatar>
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
                  <Space>
                    {!isMember && (
                      <Button
                        onClick={() => navigate(`/groups/${group.id}`)}
                        style={{ borderRadius: 6 }}
                      >
                        Отправить заявку
                      </Button>
                    )}
                    {isMember && (
                      <Tag color="success" style={{ borderRadius: 6, padding: '2px 10px' }}>Участник</Tag>
                    )}
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'view', label: 'Открыть', onClick: () => navigate(`/groups/${group.id}`) },
                          ...(group.ownerId === currentUser.id ? [{ key: 'delete', label: 'Удалить', danger: true }] : []),
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
```

- [ ] **Step 2: Проверить в браузере**

```bash
npm run dev
```

Открыть `http://localhost:5173` — должен показываться список рассылок с поиском и табами.

- [ ] **Step 3: Commit**

```bash
git add src/pages/GroupList.tsx
git commit -m "feat: GroupList with search, tabs, filters, sort"
```

---

## Task 6: GroupCreate — форма создания рассылки

**Files:**
- Create: `src/pages/GroupCreate.tsx`

- [ ] **Step 1: Создать `src/pages/GroupCreate.tsx`**

```tsx
import { useState } from 'react'
import {
  Typography, Button, Card, Form, Input, Select, Switch,
  Space, message, Radio,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import type { CreateGroupInput } from '../types'
import { mailGroupService } from '../services'
import { useCurrentUser } from '../context/CurrentUserContext'
import MetaTagsInput from '../components/MetaTagsInput'

const BUSINESS_LINES = ['SME', 'Car Loan', 'Retail', 'Marketing', 'IT', 'Legal', 'Finance', 'HR']

export default function GroupCreate() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [tags, setTags] = useState<string[]>([])

  // Auto-generate mailNickname from displayName
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nickname = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 64)
    form.setFieldValue('mailNickname', nickname)
  }

  const handleSubmit = async (values: Record<string, unknown>) => {
    setLoading(true)
    try {
      const input: CreateGroupInput = {
        displayName: values.displayName as string,
        mailNickname: values.mailNickname as string,
        description: values.description as string | undefined,
        businessLine: values.businessLine as string | undefined,
        tags,
        type: values.type as 'regular' | 'dynamic',
        visibility: values.visibility as 'Public' | 'Private',
        hideFromAddressLists: values.hideFromAddressLists as boolean,
      }
      const group = await mailGroupService.createGroup(input, currentUser.id)
      message.success(`Рассылка «${group.displayName}» создана — ${group.mail}`)
      navigate(`/groups/${group.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 680 }}>
      <Space style={{ marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')}>Назад</Button>
        <Typography.Title level={3} style={{ margin: 0 }}>Создать рассылку</Typography.Title>
      </Space>

      <Card style={{ borderRadius: 12 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ type: 'regular', visibility: 'Public', hideFromAddressLists: false }}
          onFinish={handleSubmit}
        >
          <Form.Item label="Название рассылки" name="displayName" rules={[{ required: true, message: 'Укажите название' }]}>
            <Input placeholder="Проектное финансирование 214-ФЗ" onChange={handleNameChange} />
          </Form.Item>

          <Form.Item
            label="Адрес рассылки"
            name="mailNickname"
            rules={[
              { required: true, message: 'Укажите адрес' },
              { pattern: /^[a-z0-9-]+$/, message: 'Только латинские буквы, цифры и дефис' },
            ]}
            extra={<span style={{ color: '#888', fontSize: 12 }}>@company.com — адрес будет зарегистрирован в Microsoft</span>}
          >
            <Input placeholder="pf-214-fz" addonAfter="@company.com" />
          </Form.Item>

          <Form.Item label="Описание" name="description">
            <Input.TextArea rows={2} placeholder="Краткое описание рассылки" />
          </Form.Item>

          <Form.Item label="Бизнес-линия" name="businessLine">
            <Select
              placeholder="Выберите бизнес-линию"
              allowClear
              options={BUSINESS_LINES.map((bl) => ({ label: bl, value: bl }))}
            />
          </Form.Item>

          <Form.Item label="Тэги">
            <MetaTagsInput value={tags} onChange={setTags} />
          </Form.Item>

          <Form.Item label="Тип рассылки" name="type">
            <Radio.Group>
              <Radio value="regular">Обычная</Radio>
              <Radio value="dynamic">Динамическая (членство по правилу)</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label="Видимость" name="visibility">
            <Radio.Group>
              <Radio value="Public">Общая — видна всем</Radio>
              <Radio value="Private">Скрытая — только по приглашению</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label="Скрыть из глобального адресника Microsoft"
            name="hideFromAddressLists"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" size="large" loading={loading}>
              Создать рассылку
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: Создать `src/components/MetaTagsInput.tsx`**

```tsx
import { Input, Tag } from 'antd'
import { useState } from 'react'

interface Props {
  value: string[]
  onChange: (v: string[]) => void
}

export default function MetaTagsInput({ value, onChange }: Props) {
  const [input, setInput] = useState('')

  const add = () => {
    const tag = input.trim()
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setInput('')
  }

  return (
    <div>
      <div style={{ marginBottom: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {value.map((t) => (
          <Tag key={t} closable onClose={() => onChange(value.filter((x) => x !== t))}>
            {t}
          </Tag>
        ))}
      </div>
      <Input
        size="small"
        style={{ width: 180 }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onPressEnter={add}
        onBlur={add}
        placeholder="Добавить тэг..."
      />
    </div>
  )
}
```

- [ ] **Step 3: Проверить сборку**

```bash
npm run build
```

Ожидание: `✓ built` без ошибок.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GroupCreate.tsx src/components/MetaTagsInput.tsx
git commit -m "feat: GroupCreate form with mock Microsoft registration"
```

---

## Task 7: GroupDetail — детальная страница + заявка на вступление

**Files:**
- Create: `src/pages/GroupDetail.tsx`

- [ ] **Step 1: Создать `src/pages/GroupDetail.tsx`**

```tsx
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
  const [myRequest, setMyRequest] = useState<JoinRequest | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    if (!id) return
    setLoading(true)
    const g = await mailGroupService.getGroup(id)
    if (!g) { message.error('Рассылка не найдена'); navigate('/groups'); return }
    setGroup(g)
    const [o, m, reqs] = await Promise.all([
      mailGroupService.getUser(g.ownerId),
      mailGroupService.getGroupMembers(id),
      mailGroupService.getJoinRequests(id),
    ])
    setOwner(o)
    setMembers(m)
    setRequests(reqs)
    setMyRequest(reqs.find((r) => r.userId === currentUser.id && r.status === 'pending') ?? null)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  const handleJoinRequest = async () => {
    if (!group) return
    setSubmitting(true)
    const req = await mailGroupService.submitJoinRequest(group.id, currentUser.id)
    setMyRequest(req)
    message.success('Заявка отправлена — ожидайте подтверждения владельца')
    setSubmitting(false)
  }

  const handleApprove = async (requestId: string) => {
    await mailGroupService.approveJoinRequest(requestId)
    message.success('Заявка одобрена')
    load()
  }

  const handleReject = async (requestId: string) => {
    await mailGroupService.rejectJoinRequest(requestId)
    message.success('Заявка отклонена')
    load()
  }

  const handleDelete = async () => {
    if (!group) return
    await mailGroupService.deleteGroup(group.id)
    message.success('Рассылка удалена')
    navigate('/groups')
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
              const requester = members.find((m) => m.id === req.userId) ??
                { displayName: req.userId, id: req.userId, mail: '' }
              return (
                <List.Item
                  actions={[
                    <Button
                      key="approve"
                      type="primary"
                      size="small"
                      icon={<CheckOutlined />}
                      onClick={() => handleApprove(req.id)}
                    >
                      Одобрить
                    </Button>,
                    <Button
                      key="reject"
                      danger
                      size="small"
                      icon={<CloseOutlined />}
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
```

- [ ] **Step 2: Проверить сборку**

```bash
npm run build
```

Ожидание: `✓ built` без ошибок.

- [ ] **Step 3: Запустить все тесты**

```bash
npm run test
```

Ожидание: 5/5 PASS.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GroupDetail.tsx
git commit -m "feat: GroupDetail with join request flow and member management"
```

---

## Self-Review

**Spec coverage:**
- ✅ Создать рассылку → GroupCreate (Task 6)
- ✅ Найти рассылку по поиску → GroupList search + фильтры (Task 5)
- ✅ Вступить в рассылку → GroupDetail, кнопка «Отправить заявку» (Task 7)
- ✅ Настройки: общая/скрытая → `visibility`, `hideFromAddressLists` в CreateGroupInput
- ✅ Microsoft видит рассылку → `createGroup` генерирует `mail: {nickname}@company.com`, мок симулирует ответ Graph API
- ✅ Моки → MockMailGroupService с интерфейсом IMailGroupService (готов к замене)
- ✅ Дизайн по референсу: карточки, табы со счётчиками, фильтры, сортировка, синяя тема

**Placeholder scan:** Нет TBD/TODO/placeholder.

**Type consistency:** `CreateGroupInput` определён в types/index.ts (Task 2), используется в MockMailGroupService (Task 3) и GroupCreate (Task 6) — совпадает. `IMailGroupService` методы совпадают с `MockMailGroupService`.
