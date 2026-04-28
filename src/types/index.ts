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
  ownerIds: string[];
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
