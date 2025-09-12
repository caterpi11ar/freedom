import type { SessionManager } from '../browser/SessionManager'
import type { DataStoreManager } from '../storage/DataStore'
import { EventEmitter } from 'node:events'

export interface Logger {
  info: (message: string, metadata?: Record<string, unknown>) => void
  warn: (message: string, metadata?: Record<string, unknown>) => void
  error: (message: string, error?: Error, metadata?: Record<string, unknown>) => void
  debug: (message: string, metadata?: Record<string, unknown>) => void
}

export interface AccountConfig {
  id: string
  username: string
  password: string
  email?: string
  phone?: string
  region: string
  serverType: 'official' | 'bilibili' | 'global'
  groupId?: string
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  isActive: boolean
  lastLogin?: Date
  loginCount: number
  status: AccountStatus
  healthScore: number
  tags: string[]
}

export enum AccountStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  BANNED = 'banned',
  SUSPENDED = 'suspended',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
}

export interface AccountGroup {
  id: string
  name: string
  description?: string
  accountIds: Set<string>
  rotationStrategy: RotationStrategy
  rotationInterval: number // 分钟
  isActive: boolean
  metadata: Record<string, any>
  createdAt: Date
  lastRotation?: Date
}

export enum RotationStrategy {
  ROUND_ROBIN = 'round_robin',
  RANDOM = 'random',
  HEALTH_BASED = 'health_based',
  USAGE_BASED = 'usage_based',
}

export interface AccountHealthCheck {
  accountId: string
  timestamp: Date
  score: number
  issues: string[]
  recommendations: string[]
  sessionInfo?: {
    active: boolean
    lastActivity?: Date
    errors: number
  }
}

export interface AccountManagerConfig {
  healthCheckInterval: number // 分钟
  maxConcurrentSessions: number
  defaultRotationInterval: number
  autoCleanupInactive: boolean
  cleanupThreshold: number // 天
}

export class AccountManager extends EventEmitter {
  private accounts: Map<string, AccountConfig> = new Map()
  private groups: Map<string, AccountGroup> = new Map()
  private healthChecks: Map<string, AccountHealthCheck> = new Map()
  private currentAccountInGroup: Map<string, string> = new Map()
  private rotationTimers: Map<string, NodeJS.Timeout> = new Map()

  private dataStore: DataStoreManager
  private sessionManager: SessionManager
  private logger: Logger
  private config: AccountManagerConfig

  constructor(
    dataStore: DataStoreManager,
    sessionManager: SessionManager,
    logger: Logger,
    config: Partial<AccountManagerConfig> = {},
  ) {
    super()

    this.dataStore = dataStore
    this.sessionManager = sessionManager
    this.logger = logger

    this.config = {
      healthCheckInterval: 30, // 30分钟
      maxConcurrentSessions: 5,
      defaultRotationInterval: 60, // 1小时
      autoCleanupInactive: true,
      cleanupThreshold: 30, // 30天
      ...config,
    }

    this.initialize()
  }

  /**
   * 初始化账户管理器
   */
  private async initialize(): Promise<void> {
    try {
      // 从数据存储加载账户和分组
      await this.loadAccountsFromStorage()
      await this.loadGroupsFromStorage()

      // 启动健康检查
      this.startHealthCheckRoutine()

      // 启动分组轮换
      this.startGroupRotations()

      this.logger.info('AccountManager initialized successfully', {
        accountCount: this.accounts.size,
        groupCount: this.groups.size,
      })

      this.emit('initialized')
    }
    catch (error) {
      this.logger.error('Failed to initialize AccountManager', error as Error)
      this.emit('error', error)
    }
  }

  /**
   * 添加账户
   */
  async addAccount(accountData: Omit<AccountConfig, 'id' | 'createdAt' | 'updatedAt' | 'loginCount' | 'healthScore'>): Promise<AccountConfig> {
    const account: AccountConfig = {
      id: `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...accountData,
      createdAt: new Date(),
      updatedAt: new Date(),
      loginCount: 0,
      healthScore: 100,
    }

    this.accounts.set(account.id, account)

    // 保存到存储
    await this.saveAccountToStorage(account)

    this.logger.info('Account added', { accountId: account.id, username: account.username })
    this.emit('accountAdded', account)

    return account
  }

  /**
   * 更新账户
   */
  async updateAccount(accountId: string, updates: Partial<AccountConfig>): Promise<AccountConfig | null> {
    const account = this.accounts.get(accountId)
    if (!account) {
      this.logger.warn('Attempted to update non-existent account', { accountId })
      return null
    }

    const updatedAccount = {
      ...account,
      ...updates,
      updatedAt: new Date(),
    }

    this.accounts.set(accountId, updatedAccount)

    // 保存到存储
    await this.saveAccountToStorage(updatedAccount)

    this.logger.info('Account updated', { accountId, updates: Object.keys(updates) })
    this.emit('accountUpdated', updatedAccount)

    return updatedAccount
  }

  /**
   * 删除账户
   */
  async removeAccount(accountId: string): Promise<boolean> {
    const account = this.accounts.get(accountId)
    if (!account)
      return false

    // 关闭账户的所有会话
    await this.sessionManager.releaseAccountSessions(accountId)

    // 从所有分组中移除
    for (const group of this.groups.values()) {
      if (group.accountIds.has(accountId)) {
        group.accountIds.delete(accountId)
        await this.saveGroupToStorage(group)
      }
    }

    // 删除账户
    this.accounts.delete(accountId)
    this.healthChecks.delete(accountId)

    // 从存储中删除
    this.dataStore.removeAccountConfig(accountId)

    this.logger.info('Account removed', { accountId })
    this.emit('accountRemoved', { accountId })

    return true
  }

  /**
   * 获取账户
   */
  getAccount(accountId: string): AccountConfig | undefined {
    return this.accounts.get(accountId)
  }

  /**
   * 获取所有账户
   */
  getAllAccounts(): AccountConfig[] {
    return Array.from(this.accounts.values())
  }

  /**
   * 根据条件过滤账户
   */
  filterAccounts(filter: {
    status?: AccountStatus
    groupId?: string
    region?: string
    serverType?: string
    tags?: string[]
    minHealthScore?: number
  }): AccountConfig[] {
    return this.getAllAccounts().filter((account) => {
      if (filter.status && account.status !== filter.status)
        return false
      if (filter.groupId && account.groupId !== filter.groupId)
        return false
      if (filter.region && account.region !== filter.region)
        return false
      if (filter.serverType && account.serverType !== filter.serverType)
        return false
      if (filter.minHealthScore && account.healthScore < filter.minHealthScore)
        return false
      if (filter.tags && !filter.tags.every(tag => account.tags.includes(tag)))
        return false

      return true
    })
  }

  /**
   * 创建账户分组
   */
  async createGroup(groupData: Omit<AccountGroup, 'id' | 'createdAt' | 'accountIds'>): Promise<AccountGroup> {
    const group: AccountGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...groupData,
      accountIds: new Set(),
      createdAt: new Date(),
    }

    this.groups.set(group.id, group)

    // 启动轮换计时器
    if (group.isActive) {
      this.startGroupRotation(group.id)
    }

    // 保存到存储
    await this.saveGroupToStorage(group)

    this.logger.info('Account group created', { groupId: group.id, name: group.name })
    this.emit('groupCreated', group)

    return group
  }

  /**
   * 向分组添加账户
   */
  async addAccountToGroup(accountId: string, groupId: string): Promise<boolean> {
    const account = this.accounts.get(accountId)
    const group = this.groups.get(groupId)

    if (!account || !group) {
      this.logger.warn('Failed to add account to group: account or group not found', { accountId, groupId })
      return false
    }

    // 从旧分组中移除
    if (account.groupId) {
      const oldGroup = this.groups.get(account.groupId)
      if (oldGroup) {
        oldGroup.accountIds.delete(accountId)
        await this.saveGroupToStorage(oldGroup)
      }
    }

    // 添加到新分组
    group.accountIds.add(accountId)
    account.groupId = groupId
    account.updatedAt = new Date()

    // 保存变更
    await this.saveGroupToStorage(group)
    await this.saveAccountToStorage(account)

    this.logger.info('Account added to group', { accountId, groupId })
    this.emit('accountAddedToGroup', { accountId, groupId })

    return true
  }

  /**
   * 从分组移除账户
   */
  async removeAccountFromGroup(accountId: string, groupId: string): Promise<boolean> {
    const account = this.accounts.get(accountId)
    const group = this.groups.get(groupId)

    if (!account || !group)
      return false

    group.accountIds.delete(accountId)
    account.groupId = undefined
    account.updatedAt = new Date()

    // 保存变更
    await this.saveGroupToStorage(group)
    await this.saveAccountToStorage(account)

    this.logger.info('Account removed from group', { accountId, groupId })
    this.emit('accountRemovedFromGroup', { accountId, groupId })

    return true
  }

  /**
   * 获取分组的当前活跃账户
   */
  getCurrentAccountForGroup(groupId: string): AccountConfig | null {
    const currentAccountId = this.currentAccountInGroup.get(groupId)
    if (!currentAccountId)
      return null

    const account = this.accounts.get(currentAccountId)
    return account || null
  }

  /**
   * 手动轮换分组账户
   */
  async rotateGroupAccount(groupId: string): Promise<AccountConfig | null> {
    const group = this.groups.get(groupId)
    if (!group || group.accountIds.size === 0)
      return null

    const accounts = Array.from(group.accountIds)
      .map(id => this.accounts.get(id))
      .filter(acc => acc && acc.isActive && acc.status === AccountStatus.ACTIVE)

    if (accounts.length === 0)
      return null

    let nextAccount: AccountConfig

    switch (group.rotationStrategy) {
      case RotationStrategy.ROUND_ROBIN:
        nextAccount = this.selectRoundRobinAccount(accounts as AccountConfig[], groupId)
        break
      case RotationStrategy.RANDOM:
        nextAccount = accounts[Math.floor(Math.random() * accounts.length)] as AccountConfig
        break
      case RotationStrategy.HEALTH_BASED:
        nextAccount = this.selectHealthBasedAccount(accounts as AccountConfig[])
        break
      case RotationStrategy.USAGE_BASED:
        nextAccount = this.selectUsageBasedAccount(accounts as AccountConfig[])
        break
      default:
        nextAccount = accounts[0] as AccountConfig
    }

    // 关闭之前账户的会话
    const previousAccountId = this.currentAccountInGroup.get(groupId)
    if (previousAccountId) {
      await this.sessionManager.releaseAccountSessions(previousAccountId)
    }

    // 设置新的当前账户
    this.currentAccountInGroup.set(groupId, nextAccount.id)
    group.lastRotation = new Date()

    // 保存分组状态
    await this.saveGroupToStorage(group)

    this.logger.info('Group account rotated', {
      groupId,
      previousAccountId,
      newAccountId: nextAccount.id,
      strategy: group.rotationStrategy,
    })

    this.emit('accountRotated', {
      groupId,
      previousAccountId,
      newAccount: nextAccount,
    })

    return nextAccount
  }

  /**
   * 执行账户健康检查
   */
  async performHealthCheck(accountId: string): Promise<AccountHealthCheck> {
    const account = this.accounts.get(accountId)
    if (!account) {
      throw new Error(`Account not found: ${accountId}`)
    }

    const healthCheck: AccountHealthCheck = {
      accountId,
      timestamp: new Date(),
      score: 100,
      issues: [],
      recommendations: [],
    }

    // 检查账户状态
    if (account.status !== AccountStatus.ACTIVE) {
      healthCheck.score -= 30
      healthCheck.issues.push(`账户状态异常: ${account.status}`)
    }

    // 检查登录频率
    if (account.lastLogin) {
      const daysSinceLogin = (Date.now() - account.lastLogin.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceLogin > 7) {
        healthCheck.score -= 20
        healthCheck.issues.push('长时间未登录')
        healthCheck.recommendations.push('建议重新登录验证账户状态')
      }
    }

    // 检查会话状态
    const sessions = this.sessionManager.getAccountSessions(accountId)
    if (sessions.length > 0) {
      const activeSessions = sessions.filter(s => s.isActive)
      const recentActivity = sessions.some(s =>
        (Date.now() - s.lastActivity.getTime()) < 5 * 60 * 1000, // 5分钟内有活动
      )

      healthCheck.sessionInfo = {
        active: activeSessions.length > 0,
        lastActivity: sessions.reduce((latest, s) =>
          s.lastActivity > latest ? s.lastActivity : latest, new Date(0)),
        errors: 0, // 这里应该从会话错误统计中获取
      }

      if (!recentActivity) {
        healthCheck.score -= 10
        healthCheck.issues.push('会话长时间无活动')
      }
    }

    // 更新账户健康分数
    account.healthScore = healthCheck.score
    account.updatedAt = new Date()
    await this.saveAccountToStorage(account)

    // 保存健康检查结果
    this.healthChecks.set(accountId, healthCheck)

    this.logger.debug('Health check completed', {
      accountId,
      score: healthCheck.score,
      issues: healthCheck.issues.length,
    })

    this.emit('healthCheckCompleted', healthCheck)

    return healthCheck
  }

  /**
   * 获取账户统计信息
   */
  getAccountStatistics(): {
    total: number
    active: number
    byStatus: Record<AccountStatus, number>
    byRegion: Record<string, number>
    byServerType: Record<string, number>
    averageHealthScore: number
    groupedAccounts: number
  } {
    const accounts = this.getAllAccounts()
    const stats = {
      total: accounts.length,
      active: 0,
      byStatus: {} as Record<AccountStatus, number>,
      byRegion: {} as Record<string, number>,
      byServerType: {} as Record<string, number>,
      averageHealthScore: 0,
      groupedAccounts: 0,
    }

    // 初始化计数器
    Object.values(AccountStatus).forEach((status) => {
      stats.byStatus[status] = 0
    })

    let totalHealthScore = 0

    for (const account of accounts) {
      if (account.isActive)
        stats.active++
      if (account.groupId)
        stats.groupedAccounts++

      stats.byStatus[account.status]++
      stats.byRegion[account.region] = (stats.byRegion[account.region] || 0) + 1
      stats.byServerType[account.serverType] = (stats.byServerType[account.serverType] || 0) + 1

      totalHealthScore += account.healthScore
    }

    stats.averageHealthScore = accounts.length > 0 ? totalHealthScore / accounts.length : 0

    return stats
  }

  // 私有方法实现...

  private selectRoundRobinAccount(accounts: AccountConfig[], groupId: string): AccountConfig {
    const currentAccountId = this.currentAccountInGroup.get(groupId)
    if (!currentAccountId)
      return accounts[0]

    const currentIndex = accounts.findIndex(acc => acc.id === currentAccountId)
    const nextIndex = (currentIndex + 1) % accounts.length
    return accounts[nextIndex]
  }

  private selectHealthBasedAccount(accounts: AccountConfig[]): AccountConfig {
    return accounts.reduce((best, current) =>
      current.healthScore > best.healthScore ? current : best,
    )
  }

  private selectUsageBasedAccount(accounts: AccountConfig[]): AccountConfig {
    return accounts.reduce((least, current) =>
      current.loginCount < least.loginCount ? current : least,
    )
  }

  private startHealthCheckRoutine(): void {
    setInterval(() => {
      this.performHealthCheckForAllAccounts()
    }, this.config.healthCheckInterval * 60 * 1000)
  }

  private async performHealthCheckForAllAccounts(): Promise<void> {
    const accounts = this.filterAccounts({ status: AccountStatus.ACTIVE })

    for (const account of accounts) {
      try {
        await this.performHealthCheck(account.id)
      }
      catch (error) {
        this.logger.error('Health check failed for account', error as Error, { accountId: account.id })
      }
    }
  }

  private startGroupRotations(): void {
    for (const group of this.groups.values()) {
      if (group.isActive) {
        this.startGroupRotation(group.id)
      }
    }
  }

  private startGroupRotation(groupId: string): void {
    const group = this.groups.get(groupId)
    if (!group)
      return

    const timer = setInterval(() => {
      this.rotateGroupAccount(groupId).catch((error) => {
        this.logger.error('Group rotation failed', error as Error, { groupId })
      })
    }, group.rotationInterval * 60 * 1000)

    this.rotationTimers.set(groupId, timer)
  }

  private async loadAccountsFromStorage(): Promise<void> {
    const accounts = this.dataStore.getAccountConfigs()
    for (const account of accounts) {
      // 转换 AccountConfig 到 AccountManager 的 AccountConfig 格式
      const convertedAccount: AccountConfig = {
        id: account.id,
        username: account.name,
        password: '', // 需要解密 encryptedCredentials
        email: undefined,
        phone: undefined,
        region: 'cn', // 默认值
        serverType: account.server === 'official' ? 'official' : 'bilibili',
        groupId: account.groupId,
        metadata: {},
        createdAt: account.createdAt,
        updatedAt: account.lastUsed,
        isActive: account.status === 'active',
        lastLogin: account.lastUsed,
        loginCount: 0, // 需要从其他地方获取
        status: this.convertStatus(account.status),
        healthScore: 100, // 默认值
        tags: [],
      }
      this.accounts.set(convertedAccount.id, convertedAccount)
    }
  }

  private convertStatus(status: string): AccountStatus {
    switch (status) {
      case 'active': return AccountStatus.ACTIVE
      case 'disabled': return AccountStatus.INACTIVE
      case 'banned': return AccountStatus.BANNED
      case 'maintenance': return AccountStatus.MAINTENANCE
      default: return AccountStatus.ERROR
    }
  }

  private async loadGroupsFromStorage(): Promise<void> {
    // 这里应该实现从存储加载分组的逻辑
    // 暂时留空，等待存储系统实现分组相关方法
  }

  private async saveAccountToStorage(account: AccountConfig): Promise<void> {
    // 转换为存储格式
    const storageAccount = {
      id: account.id,
      name: account.username,
      nickname: account.username,
      server: account.serverType as 'official' | 'bilibili',
      encryptedCredentials: '', // 需要加密密码
      gameUrl: '',
      autoLogin: true,
      groupId: account.groupId,
      priority: 0,
      status: account.status.toLowerCase() as 'active' | 'disabled' | 'banned' | 'maintenance',
      lastUsed: account.lastLogin || account.updatedAt,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }
    this.dataStore.addAccountConfig(storageAccount)
  }

  private async saveGroupToStorage(_group: AccountGroup): Promise<void> {
    // 这里应该实现保存分组到存储的逻辑
    // 暂时留空，等待存储系统实现分组相关方法
  }
}
