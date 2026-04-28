import { HttpMailGroupService } from './HttpMailGroupService';
import { MockMailGroupService } from './MockMailGroupService';
import type { IMailGroupService } from './IMailGroupService';

export const mailGroupService: IMailGroupService =
  import.meta.env.VITE_USE_HTTP_API === 'true'
    ? new HttpMailGroupService()
    : new MockMailGroupService();
