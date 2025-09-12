import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export interface SimpleAccountConfig {
  id: string
  displayName: string
  gameUrl: string
  cookiesFile?: string
  storageFile?: string
  lastLoginTime: Date
  loginCount: number
  status: 'active' | 'disabled' | 'error'
}

export interface SystemConfig {
  version: string
  lastUsedAccountId?: string
  dataDirectory: string
  autoCleanup: boolean
  sessionTimeout: number
  maxConcurrentSessions: number
  logLevel: 'debug' | 'info' | 'warn' | 'error'
}

export interface FreedomConfig {
  system: SystemConfig
  accounts: SimpleAccountConfig[]
}

export class ConfigManager {
  private configDir: string
  private configFile: string
  private accountsFile: string
  private lastUsedFile: string
  private config: FreedomConfig | null = null

  constructor() {
    this.configDir = path.join(os.homedir(), '.freedom')
    this.configFile = path.join(this.configDir, 'config.json')
    this.accountsFile = path.join(this.configDir, 'accounts.json')
    this.lastUsedFile = path.join(this.configDir, 'last_used.txt')
  }

  async initialize(): Promise<void> {
    await this.ensureConfigDirectory()
    await this.loadConfig()
  }

  private async ensureConfigDirectory(): Promise<void> {
    try {
      await fs.access(this.configDir)
    }
    catch {
      await fs.mkdir(this.configDir, { recursive: true })
    }
  }

  private createDefaultConfig(): FreedomConfig {
    return {
      system: {
        version: '1.0.0',
        dataDirectory: this.configDir,
        autoCleanup: true,
        sessionTimeout: 3600000, // 1小时
        maxConcurrentSessions: 3,
        logLevel: 'info',
      },
      accounts: [],
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      // 加载主配置
      const configData = await fs.readFile(this.configFile, 'utf-8')
      const config = JSON.parse(configData, this.dateReviver)

      // 加载账户配置
      const accountsData = await fs.readFile(this.accountsFile, 'utf-8')
      const accounts = JSON.parse(accountsData, this.dateReviver)

      this.config = {
        system: { ...this.createDefaultConfig().system, ...config.system },
        accounts: accounts || [],
      }
    }
    catch {
      console.warn('配置文件不存在或损坏，使用默认配置')
      this.config = this.createDefaultConfig()
      await this.saveConfig()
    }
  }

  async saveConfig(): Promise<void> {
    if (!this.config)
      return

    try {
      // 保存主配置（不包含账户信息）
      const mainConfig = {
        system: this.config.system,
      }
      await fs.writeFile(
        this.configFile,
        JSON.stringify(mainConfig, this.dateReplacer, 2),
        'utf-8',
      )

      // 单独保存账户配置
      await fs.writeFile(
        this.accountsFile,
        JSON.stringify(this.config.accounts, this.dateReplacer, 2),
        'utf-8',
      )
    }
    catch (error) {
      console.error('保存配置失败:', error)
      throw error
    }
  }

  private dateReplacer(_key: string, value: any): any {
    return value instanceof Date ? value.toISOString() : value
  }

  private dateReviver(_key: string, value: any): any {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value)
    }
    return value
  }

  // 系统配置相关方法
  getSystemConfig(): SystemConfig | null {
    return this.config?.system || null
  }

  async updateSystemConfig(updates: Partial<SystemConfig>): Promise<void> {
    if (!this.config)
      throw new Error('配置未初始化')

    this.config.system = { ...this.config.system, ...updates }
    await this.saveConfig()
  }

  // 账户配置相关方法
  getAccounts(): SimpleAccountConfig[] {
    return this.config?.accounts || []
  }

  getAccountById(id: string): SimpleAccountConfig | undefined {
    return this.config?.accounts.find(account => account.id === id)
  }

  async addAccount(account: SimpleAccountConfig): Promise<void> {
    if (!this.config)
      throw new Error('配置未初始化')

    // 检查账户ID是否已存在
    const existingIndex = this.config.accounts.findIndex(a => a.id === account.id)
    if (existingIndex !== -1) {
      this.config.accounts[existingIndex] = account
    }
    else {
      this.config.accounts.push(account)
    }

    await this.saveConfig()
  }

  async removeAccount(id: string): Promise<void> {
    if (!this.config)
      throw new Error('配置未初始化')

    this.config.accounts = this.config.accounts.filter(account => account.id !== id)

    // 如果删除的是最后使用的账户，清除记录
    const lastUsedId = await this.getLastUsedAccountId()
    if (lastUsedId === id) {
      await this.setLastUsedAccountId(undefined)
    }

    // 删除相关的cookies和storage文件
    const account = this.getAccountById(id)
    if (account) {
      try {
        if (account.cookiesFile) {
          await fs.unlink(account.cookiesFile)
        }
        if (account.storageFile) {
          await fs.unlink(account.storageFile)
        }
      }
      catch (error) {
        console.warn('删除账户文件时出错:', error)
      }
    }

    await this.saveConfig()
  }

  async updateAccount(id: string, updates: Partial<SimpleAccountConfig>): Promise<void> {
    if (!this.config)
      throw new Error('配置未初始化')

    const accountIndex = this.config.accounts.findIndex(a => a.id === id)
    if (accountIndex === -1) {
      throw new Error(`未找到账户: ${id}`)
    }

    this.config.accounts[accountIndex] = {
      ...this.config.accounts[accountIndex],
      ...updates,
    }

    await this.saveConfig()
  }

  // 最后使用账户相关方法
  async getLastUsedAccountId(): Promise<string | undefined> {
    try {
      const lastUsedId = await fs.readFile(this.lastUsedFile, 'utf-8')
      return lastUsedId.trim() || undefined
    }
    catch {
      return undefined
    }
  }

  async setLastUsedAccountId(accountId: string | undefined): Promise<void> {
    if (accountId) {
      await fs.writeFile(this.lastUsedFile, accountId, 'utf-8')
    }
    else {
      try {
        await fs.unlink(this.lastUsedFile)
      }
      catch {
        // 文件不存在，忽略错误
      }
    }
  }

  // 账户状态统计
  getAccountStats(): {
    total: number
    active: number
    disabled: number
    error: number
    lastUsed?: SimpleAccountConfig
  } {
    const accounts = this.getAccounts()
    const stats = {
      total: accounts.length,
      active: accounts.filter(a => a.status === 'active').length,
      disabled: accounts.filter(a => a.status === 'disabled').length,
      error: accounts.filter(a => a.status === 'error').length,
      lastUsed: undefined as SimpleAccountConfig | undefined,
    }

    // 获取最后使用的账户
    const sortedAccounts = accounts
      .filter(a => a.lastLoginTime)
      .sort((a, b) => b.lastLoginTime.getTime() - a.lastLoginTime.getTime())

    if (sortedAccounts.length > 0) {
      stats.lastUsed = sortedAccounts[0]
    }

    return stats
  }

  // 获取账户数据文件路径
  getAccountDataPath(accountId: string): {
    cookiesFile: string
    storageFile: string
  } {
    const accountDir = path.join(this.configDir, 'accounts', accountId)
    return {
      cookiesFile: path.join(accountDir, 'cookies.json'),
      storageFile: path.join(accountDir, 'storage.json'),
    }
  }

  async ensureAccountDataDirectory(accountId: string): Promise<string> {
    const accountDir = path.join(this.configDir, 'accounts', accountId)
    await fs.mkdir(accountDir, { recursive: true })
    return accountDir
  }

  // 配置验证和修复
  async validateAndRepair(): Promise<{
    isValid: boolean
    issues: string[]
    fixed: string[]
  }> {
    const issues: string[] = []
    const fixed: string[] = []

    if (!this.config) {
      issues.push('配置未初始化')
      return { isValid: false, issues, fixed }
    }

    // 检查重复的账户ID
    const accountIds = new Set<string>()
    const duplicateAccounts: number[] = []

    this.config.accounts.forEach((account, index) => {
      if (accountIds.has(account.id)) {
        duplicateAccounts.push(index)
      }
      else {
        accountIds.add(account.id)
      }
    })

    if (duplicateAccounts.length > 0) {
      issues.push(`发现重复的账户ID: ${duplicateAccounts.length} 个`)
      // 移除重复账户
      duplicateAccounts.reverse().forEach((index) => {
        this.config!.accounts.splice(index, 1)
      })
      fixed.push('移除重复账户')
    }

    // 检查无效的文件路径
    for (const account of this.config.accounts) {
      if (account.cookiesFile) {
        try {
          await fs.access(account.cookiesFile)
        }
        catch {
          issues.push(`账户 ${account.displayName} 的cookies文件不存在`)
          account.cookiesFile = undefined
          fixed.push(`清理无效的cookies文件路径: ${account.displayName}`)
        }
      }
    }

    // 保存修复后的配置
    if (fixed.length > 0) {
      await this.saveConfig()
    }

    return {
      isValid: issues.length === 0,
      issues,
      fixed,
    }
  }

  // 备份和恢复
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(this.configDir, 'backups', timestamp)
    await fs.mkdir(backupDir, { recursive: true })

    // 复制配置文件
    await fs.copyFile(this.configFile, path.join(backupDir, 'config.json'))
    await fs.copyFile(this.accountsFile, path.join(backupDir, 'accounts.json'))

    // 复制账户数据目录
    const accountsDir = path.join(this.configDir, 'accounts')
    try {
      await fs.access(accountsDir)
      await fs.cp(accountsDir, path.join(backupDir, 'accounts'), { recursive: true })
    }
    catch {
      // 账户目录不存在，跳过
    }

    return backupDir
  }

  async cleanup(): Promise<void> {
    // 清理过期的备份
    const backupsDir = path.join(this.configDir, 'backups')
    try {
      const backups = await fs.readdir(backupsDir)
      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      for (const backup of backups) {
        const backupDate = new Date(backup.replace(/-/g, ':'))
        if (backupDate < oneWeekAgo) {
          await fs.rm(path.join(backupsDir, backup), { recursive: true })
        }
      }
    }
    catch {
      // 备份目录不存在，跳过
    }
  }
}

// 导出单例实例
export const configManager = new ConfigManager()
