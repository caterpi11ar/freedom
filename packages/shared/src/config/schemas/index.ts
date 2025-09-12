import { z } from 'zod'
import { AccountsSchema } from './accounts.js'
import { SettingsSchema } from './settings.js'

export { AccountsSchema } from './accounts.js'
// Re-export individual schemas
export { SettingsSchema } from './settings.js'

// Complete Freedom Config Schema
export const FreedomConfigSchema = z.object({
  settings: SettingsSchema,
  accounts: AccountsSchema,
})
