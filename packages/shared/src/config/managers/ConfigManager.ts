import type { ConfigPath, FreedomConfig, PartialConfig } from '../types.js'
import process from 'node:process'
import { cosmiconfig } from 'cosmiconfig'
import { config as dotenvConfig } from 'dotenv'
import { DEFAULT_CONFIG, ENV_MAPPING } from '../defaults/index.js'
import { FreedomConfigSchema } from '../schemas/index.js'
import { deepMerge, getNestedValue, parseEnvValue, setNestedValue } from '../utils/index.js'
import { AccountsManager } from './AccountsManager.js'
import { SettingsManager } from './SettingsManager.js'

// Load environment variables
dotenvConfig()

export class ConfigManager {
  private config: FreedomConfig = DEFAULT_CONFIG
  private settingsManager!: SettingsManager
  private accountsManager!: AccountsManager

  constructor() {
    this.settingsManager = new SettingsManager()
    this.accountsManager = new AccountsManager()
  }

  async load(): Promise<void> {
    const explorer = cosmiconfig('freedom')

    // 1. Load project config
    const projectResult = await explorer.search()
    const projectConfig = projectResult?.config || {}

    // 2. Load user configs via individual managers
    await this.settingsManager.load()
    await this.accountsManager.load()

    const userStoredSettings = this.settingsManager.getConfig()
    const userStoredAccounts = this.accountsManager.getConfig()

    // 3. Handle environment variables
    const envConfig: PartialConfig = {}
    for (const [envVar, configPath] of Object.entries(ENV_MAPPING)) {
      const value = process.env[envVar]
      if (value !== undefined) {
        setNestedValue(envConfig, configPath, parseEnvValue(value))
      }
    }

    // Special handling for API Key environment variable
    if (process.env.FREEDOM_API_KEY) {
      if (!envConfig.accounts) {
        envConfig.accounts = { accounts: {} }
      }
      envConfig.accounts.defaultAccount = 'default'
      if (!envConfig.accounts.accounts) {
        envConfig.accounts.accounts = {}
      }
      envConfig.accounts.accounts.default = {
        apiKey: process.env.FREEDOM_API_KEY,
        region: (process.env.FREEDOM_REGION as any) || 'cn',
      }
    }

    // 4. Merge configs by priority
    const merged: FreedomConfig = {
      settings: deepMerge(
        DEFAULT_CONFIG.settings,
        userStoredSettings,
        projectConfig.settings || {},
        envConfig.settings || {},
      ),
      accounts: deepMerge(
        DEFAULT_CONFIG.accounts,
        userStoredAccounts,
        projectConfig.accounts || {},
        envConfig.accounts || {},
      ),
    }

    // 5. Validate final config
    this.config = FreedomConfigSchema.parse(merged)
  }

  getConfig(): FreedomConfig {
    return { ...this.config }
  }

  get<T = unknown>(path: ConfigPath): T | undefined {
    return getNestedValue(this.config, path) as T
  }

  set(path: ConfigPath, value: unknown): void {
    setNestedValue(this.config, path, value)

    // Route to appropriate manager based on path
    if (path.startsWith('settings.')) {
      const settingsPath = path.replace('settings.', '') as keyof typeof this.config.settings
      this.settingsManager.set(settingsPath, value as any)
    }
    else if (path.startsWith('accounts.')) {
      const accountsPath = path.replace('accounts.', '') as keyof typeof this.config.accounts
      this.accountsManager.set(accountsPath, value as any)
    }
  }

  async reload(): Promise<void> {
    await this.load()
  }

  async persist(): Promise<void> {
    await this.settingsManager.persist()
    await this.accountsManager.persist()
  }
}
