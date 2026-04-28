import type { IMailGroupService } from './IMailGroupService';
import type { MailGroup, User, JoinRequest, CreateGroupInput } from '../types';
import { api } from './httpClient';

interface GroupDto {
  id: string; displayName: string; mailNickname: string; mail: string;
  description?: string; visibility: 'Public' | 'Private'; businessLine?: string;
  tags: string[]; ownerIds: string[]; memberIds: string[];
  createdAt: string; updatedAt: string;
}

const toGroup = (d: GroupDto): MailGroup => ({
  id: d.id,
  displayName: d.displayName,
  mailNickname: d.mailNickname,
  mail: d.mail,
  description: d.description,
  ownerIds: d.ownerIds,
  businessLine: d.businessLine,
  tags: d.tags,
  type: 'regular',
  visibility: d.visibility,
  hideFromAddressLists: d.visibility === 'Private',
  memberIds: d.memberIds,
  createdAt: d.createdAt,
  updatedAt: d.updatedAt,
});

export class HttpMailGroupService implements IMailGroupService {
  async getGroups(): Promise<MailGroup[]> {
    return (await api<GroupDto[]>('/api/groups')).map(toGroup);
  }
  async getGroup(id: string): Promise<MailGroup | null> {
    try { return toGroup(await api<GroupDto>(`/api/groups/${id}`)); }
    catch (e: unknown) { if (String((e as Error).message).startsWith('404')) return null; throw e; }
  }
  async createGroup(input: CreateGroupInput, _ownerId?: string): Promise<MailGroup> {
    return toGroup(await api<GroupDto>('/api/groups', {
      method: 'POST', body: JSON.stringify({
        displayName: input.displayName, mailNickname: input.mailNickname,
        description: input.description, visibility: input.visibility,
        businessLine: input.businessLine, tags: input.tags,
      })
    }));
  }
  async updateGroup(id: string, patch: Partial<MailGroup>): Promise<MailGroup> {
    return toGroup(await api<GroupDto>(`/api/groups/${id}`, {
      method: 'PATCH', body: JSON.stringify({
        displayName: patch.displayName, description: patch.description,
        visibility: patch.visibility, businessLine: patch.businessLine,
        tags: patch.tags,
      })
    }));
  }
  async deleteGroup(id: string): Promise<void> {
    await api<void>(`/api/groups/${id}`, { method: 'DELETE' });
  }
  async searchGroups(q: string): Promise<MailGroup[]> {
    return (await api<GroupDto[]>(`/api/groups?search=${encodeURIComponent(q)}`)).map(toGroup);
  }

  async getGroupMembers(groupId: string): Promise<User[]> {
    return await api<User[]>(`/api/groups/${groupId}/members`);
  }
  async addMembers(groupId: string, userIds: string[]): Promise<MailGroup> {
    await api<void>(`/api/groups/${groupId}/members`, {
      method: 'POST', body: JSON.stringify({ entraUserIds: userIds }),
    });
    return (await this.getGroup(groupId))!;
  }
  async removeMember(groupId: string, userId: string): Promise<MailGroup> {
    await api<void>(`/api/groups/${groupId}/members/${userId}`, { method: 'DELETE' });
    return (await this.getGroup(groupId))!;
  }

  async submitJoinRequest(groupId: string): Promise<JoinRequest> {
    const r = await api<{ id: string; groupId: string; entraUserId: string; status: 'pending'|'approved'|'rejected'; createdAt: string }>(
      `/api/groups/${groupId}/join`, { method: 'POST' }
    );
    return { id: r.id, groupId: r.groupId, userId: r.entraUserId, status: r.status, createdAt: r.createdAt };
  }
  async getJoinRequests(groupId: string): Promise<JoinRequest[]> {
    const list = await api<Array<{ id: string; groupId: string; entraUserId: string; status: 'pending'|'approved'|'rejected'; createdAt: string }>>(
      `/api/groups/${groupId}/requests`
    );
    return list.map(r => ({ id: r.id, groupId: r.groupId, userId: r.entraUserId, status: r.status, createdAt: r.createdAt }));
  }
  async approveJoinRequest(_requestId: string): Promise<void> {
    throw new Error('approveJoinRequest needs groupId — call approveJoinRequestInGroup(groupId, reqId)');
  }
  async rejectJoinRequest(_requestId: string): Promise<void> {
    throw new Error('rejectJoinRequest needs groupId — call rejectJoinRequestInGroup(groupId, reqId)');
  }
  async getMyJoinRequests(): Promise<JoinRequest[]> { return []; }

  async approveJoinRequestInGroup(groupId: string, reqId: string): Promise<void> {
    await api<void>(`/api/groups/${groupId}/requests/${reqId}/approve`, { method: 'POST' });
  }
  async rejectJoinRequestInGroup(groupId: string, reqId: string): Promise<void> {
    await api<void>(`/api/groups/${groupId}/requests/${reqId}/reject`, { method: 'POST' });
  }

  async getUsers(): Promise<User[]> { return []; }
  async getUser(_id: string): Promise<User | null> { return null; }
  async searchUsers(q: string): Promise<User[]> {
    return await api<User[]>(`/api/users/search?q=${encodeURIComponent(q)}`);
  }

  async sendMail(groupId: string, subject: string, bodyHtml: string): Promise<void> {
    await api<void>(`/api/groups/${groupId}/mail`, {
      method: 'POST', body: JSON.stringify({ subject, bodyHtml }),
    });
  }
  async getMailHistory(groupId: string) {
    return await api<Array<{ id: string; subject: string; recipientCount: number; status: string; createdAt: string; sentAt?: string }>>(
      `/api/groups/${groupId}/mail`
    );
  }
}
