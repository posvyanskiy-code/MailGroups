import { describe, it, expect, beforeEach } from 'vitest'
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

  it('returns empty list on first load', async () => {
    const groups = await svc.getGroups()
    expect(groups).toEqual([])
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
    expect(group.ownerIds[0]).toBe('user-1')
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
    const group = await svc.createGroup(
      { displayName: 'G', mailNickname: 'g', tags: [], type: 'regular', visibility: 'Public', hideFromAddressLists: false },
      'user-1',
    )
    const req = await svc.submitJoinRequest(group.id, 'user-99')
    expect(req.status).toBe('pending')
    expect(req.groupId).toBe(group.id)
    expect(req.userId).toBe('user-99')
  })

  it('approveJoinRequest adds user to members', async () => {
    const group = await svc.createGroup(
      { displayName: 'G', mailNickname: 'g', tags: [], type: 'regular', visibility: 'Public', hideFromAddressLists: false },
      'user-1',
    )
    const req = await svc.submitJoinRequest(group.id, 'user-99')
    await svc.approveJoinRequest(req.id)
    const members = await svc.getGroupMembers(group.id)
    expect(members.some((m) => m.id === 'user-99')).toBe(true)
  })
})
