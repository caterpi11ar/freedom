import { z } from 'zod'

export const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  features: z.object({
    autoUpdate: z.boolean().default(false),
    enableTelemetry: z.boolean().default(false),
    allowRemoteControl: z.boolean().default(false),
  }).default({
    autoUpdate: false,
    enableTelemetry: false,
    allowRemoteControl: false,
  }),
  cli: z.object({
    verbosity: z.enum(['silent', 'normal', 'verbose']).default('normal'),
    interactive: z.boolean().default(true),
    locale: z.string().default('zh-CN'),
  }).default({
    verbosity: 'normal',
    interactive: true,
    locale: 'zh-CN',
  }),
})
