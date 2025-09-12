import type { z } from 'zod'
import type { AccountsSchema, FreedomConfigSchema, SettingsSchema } from './schemas/index.js'

// Type definitions from schemas
export type SettingsConfig = z.infer<typeof SettingsSchema>
export type AccountsConfig = z.infer<typeof AccountsSchema>
export type FreedomConfig = z.infer<typeof FreedomConfigSchema>

// Configuration layer types
export interface ConfigLayer {
  source: 'default' | 'system' | 'user' | 'project' | 'env'
  config: Partial<FreedomConfig>
  filePath?: string
}

export type ConfigPath = string
export type PartialConfig = Partial<FreedomConfig>

// Base config manager interface
export abstract class BaseConfigManager<T> {
  protected config!: T

  abstract load(): Promise<void>
  abstract validate(config: unknown): T
  abstract merge(...configs: Partial<T>[]): T
  abstract get<K extends keyof T>(key: K): T[K]
  abstract set<K extends keyof T>(key: K, value: T[K]): Promise<void>
  abstract persist(): Promise<void>
  abstract getConfig(): T
}
