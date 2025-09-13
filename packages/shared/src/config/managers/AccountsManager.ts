import type { AccountsConfig } from '../types.js'
import Conf from 'conf'
import { DEFAULT_ACCOUNTS_CONFIG } from '../defaults/accounts.js'
import { AccountsSchema } from '../schemas/accounts.js'
import { deepMerge } from '../utils/merge.js'
import { BaseConfigManager } from './BaseConfigManager.js'

export class AccountsManager extends BaseConfigManager<AccountsConfig> {
  private userAccounts!: Conf

  constructor() {
    super()
    this.userAccounts = new Conf({
      projectName: 'freedom',
      configName: 'accounts',
      // Remove schema validation here, use Zod validation in validate() method instead
    })
  }

  async load(): Promise<void> {
    // Load user accounts from file
    const userStoredAccounts = this.userAccounts.store as AccountsConfig

    // Merge with defaults
    this.config = this.merge(DEFAULT_ACCOUNTS_CONFIG, userStoredAccounts)

    // Validate the merged config
    this.config = this.validate(this.config)
  }

  validate(config: unknown): AccountsConfig {
    return AccountsSchema.parse(config)
  }

  merge(...configs: Partial<AccountsConfig>[]): AccountsConfig {
    return deepMerge(DEFAULT_ACCOUNTS_CONFIG, ...configs)
  }

  get<K extends keyof AccountsConfig>(key: K): AccountsConfig[K] {
    this.ensureLoaded()
    return this.config[key]
  }

  async set<K extends keyof AccountsConfig>(key: K, value: AccountsConfig[K]): Promise<void> {
    this.ensureLoaded()
    this.config[key] = value
    this.userAccounts.set(key as string, value)
  }

  async persist(): Promise<void> {
    // Accounts are automatically persisted via Conf when using set()
    // This method is here for interface compliance
  }
}
