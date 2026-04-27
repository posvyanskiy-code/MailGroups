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
  addMembers(groupId: string, userIds: string[]): Promise<MailGroup>;
  removeMember(groupId: string, userId: string): Promise<MailGroup>;
  findOrCreateUserByEmail(email: string, displayName?: string): Promise<User>;

  // Join requests
  submitJoinRequest(groupId: string, userId: string, message?: string): Promise<JoinRequest>;
  getJoinRequests(groupId: string): Promise<JoinRequest[]>;
  approveJoinRequest(requestId: string): Promise<void>;
  rejectJoinRequest(requestId: string): Promise<void>;
  getMyJoinRequests(userId: string): Promise<JoinRequest[]>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | null>;
}
