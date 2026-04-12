import { MockMailGroupService } from './MockMailGroupService'
import type { IMailGroupService } from './IMailGroupService'

export const mailGroupService: IMailGroupService = new MockMailGroupService()
