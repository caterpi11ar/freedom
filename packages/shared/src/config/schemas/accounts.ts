import { z } from 'zod'

export const AccountsSchema = z.object({
  defaultAccount: z.string().optional(),
  accounts: z.record(
    z.string(),
    z.object({
      apiKey: z.string(),
      region: z.enum(['cn', 'global']).default('cn'),
      username: z.string().optional(),
      lastLoginTime: z.string().optional(),
    }),
  ).default({}),
})
