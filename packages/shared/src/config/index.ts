// Re-export defaults
import type { ConfigPath, FreedomConfig } from './types.js'
// Main config functionality - migrated from original config.ts
import { ConfigManager } from './managers/ConfigManager.js'

export * from './defaults/index.js'

// Re-export managers
export * from './managers/index.js'

// Re-export schemas
export * from './schemas/index.js'

// Re-export all types
export type * from './types.js'

// Re-export utilities
export * from './utils/index.js'

// Export singleton instance
export const configManager = new ConfigManager()

// Convenience functions - compatible with original API
export async function loadFreedomConfig(): Promise<FreedomConfig> {
  await configManager.load()
  return configManager.getConfig()
}

export async function getConfig(): Promise<FreedomConfig> {
  await configManager.load()
  return configManager.getConfig()
}

export async function getConfigValue<T = unknown>(path: ConfigPath): Promise<T | undefined> {
  await configManager.load()
  return configManager.get<T>(path)
}

export async function setConfigValue(path: ConfigPath, value: unknown): Promise<void> {
  await configManager.load()
  configManager.set(path, value)
}

export async function reloadConfig(): Promise<void> {
  await configManager.reload()
}

export async function getAllConfigValues(): Promise<Record<string, unknown>> {
  const config = await getConfig()
  return config as unknown as Record<string, unknown>
}
