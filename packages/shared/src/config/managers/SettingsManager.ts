import type { SettingsConfig } from '../types.js'
import Conf from 'conf'
import { DEFAULT_SETTINGS_CONFIG } from '../defaults/settings.js'
import { SettingsSchema } from '../schemas/settings.js'
import { deepMerge } from '../utils/merge.js'
import { BaseConfigManager } from './BaseConfigManager.js'

export class SettingsManager extends BaseConfigManager<SettingsConfig> {
  private userSettings!: Conf

  constructor() {
    super()
    this.userSettings = new Conf({
      projectName: 'freedom',
      configName: 'settings',
      // Remove schema validation here, use Zod validation in validate() method instead
    })
  }

  async load(): Promise<void> {
    // Load user settings from file
    const userStoredSettings = this.userSettings.store as SettingsConfig

    // Merge with defaults
    this.config = this.merge(DEFAULT_SETTINGS_CONFIG, userStoredSettings)

    // Validate the merged config
    this.config = this.validate(this.config)
  }

  validate(config: unknown): SettingsConfig {
    return SettingsSchema.parse(config)
  }

  merge(...configs: Partial<SettingsConfig>[]): SettingsConfig {
    return deepMerge(DEFAULT_SETTINGS_CONFIG, ...configs)
  }

  get<K extends keyof SettingsConfig>(key: K): SettingsConfig[K] {
    this.ensureLoaded()
    return this.config[key]
  }

  async set<K extends keyof SettingsConfig>(key: K, value: SettingsConfig[K]): Promise<void> {
    this.ensureLoaded()
    this.config[key] = value
    this.userSettings.set(key as string, value)
  }

  async persist(): Promise<void> {
    // Settings are automatically persisted via Conf when using set()
    // This method is here for interface compliance
  }
}
