import type { BrowserSessionConfig, SessionInfo } from './SessionPool'
import { EventEmitter } from 'node:events'
import { BrowserSessionPool } from './SessionPool'

export interface SessionManagerConfig {
  defaultPool: BrowserSessionConfig
  pools?: Record<string, BrowserSessionConfig>
  accountSessionLimit: number
  globalSessionLimit: number
  sessionRecoveryEnabled: boolean
}

export interface SessionAllocation {
  sessionId: string
  accountId: string
  poolName: string
  createdAt: Date
  purpose?: string
}

export class SessionManager extends EventEmitter {
  private pools: Map<string, BrowserSessionPool> = new Map()
  private allocations: Map<string, SessionAllocation> = new Map()
  private accountSessions: Map<string, Set<string>> = new Map()
  private config: SessionManagerConfig
  private stateManager?: any

  constructor(config: SessionManagerConfig, stateManager?: any) {
    super()
    this.config = config
    this.stateManager = stateManager
    this.initializePools()
  }

  /**
   * 初始化会话池
   */
  private initializePools(): void {
    // 创建默认池
    this.pools.set('default', new BrowserSessionPool(this.config.defaultPool))

    // 创建自定义池
    if (this.config.pools) {
      for (const [poolName, poolConfig] of Object.entries(this.config.pools)) {
        this.pools.set(poolName, new BrowserSessionPool(poolConfig))
      }
    }

    // 为所有池设置事件监听
    for (const [poolName, pool] of this.pools) {
      pool.on('sessionCreated', (session: SessionInfo) => {
        this.handleSessionCreated(poolName, session)
      })

      pool.on('sessionClosed', (data: { sessionId: string, accountId: string }) => {
        this.handleSessionClosed(poolName, data)
      })

      pool.on('sessionError', (error: any) => {
        this.emit('sessionError', { poolName, ...error })
      })
    }
  }

  /**
   * 为账户分配会话
   */
  async allocateSession(
    accountId: string,
    options: {
      poolName?: string
      purpose?: string
      metadata?: Record<string, any>
    } = {},
  ): Promise<SessionInfo> {
    const { poolName = 'default', purpose, metadata = {} } = options

    // 检查账户会话限制
    const accountSessionCount = this.getAccountSessionCount(accountId)
    if (accountSessionCount >= this.config.accountSessionLimit) {
      throw new Error(`账户 ${accountId} 已达到会话限制: ${this.config.accountSessionLimit}`)
    }

    // 检查全局会话限制
    const globalSessionCount = this.getTotalSessionCount()
    if (globalSessionCount >= this.config.globalSessionLimit) {
      throw new Error(`已达到全局会话限制: ${this.config.globalSessionLimit}`)
    }

    // 获取指定池
    const pool = this.pools.get(poolName)
    if (!pool) {
      throw new Error(`未找到会话池: ${poolName}`)
    }

    try {
      // 创建会话
      const session = await pool.createSession(accountId, metadata)

      // 记录分配信息
      const allocation: SessionAllocation = {
        sessionId: session.id,
        accountId,
        poolName,
        createdAt: new Date(),
        purpose,
      }

      this.allocations.set(session.id, allocation)

      // 更新账户会话记录
      if (!this.accountSessions.has(accountId)) {
        this.accountSessions.set(accountId, new Set())
      }
      this.accountSessions.get(accountId)!.add(session.id)

      this.updateGlobalState()
      this.emit('sessionAllocated', { session, allocation })

      return session
    }
    catch (error) {
      this.emit('allocationError', { accountId, poolName, error })
      throw error
    }
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): SessionInfo | undefined {
    const allocation = this.allocations.get(sessionId)
    if (!allocation)
      return undefined

    const pool = this.pools.get(allocation.poolName)
    if (!pool)
      return undefined

    return pool.getSession(sessionId)
  }

  /**
   * 获取账户的所有会话
   */
  getAccountSessions(accountId: string): SessionInfo[] {
    const sessionIds = this.accountSessions.get(accountId)
    if (!sessionIds)
      return []

    const sessions: SessionInfo[] = []
    for (const sessionId of sessionIds) {
      const session = this.getSession(sessionId)
      if (session) {
        sessions.push(session)
      }
    }

    return sessions
  }

  /**
   * 释放会话
   */
  async releaseSession(sessionId: string): Promise<void> {
    const allocation = this.allocations.get(sessionId)
    if (!allocation)
      return

    const pool = this.pools.get(allocation.poolName)
    if (!pool)
      return

    try {
      await pool.closeSession(sessionId)

      // 清理分配记录
      this.allocations.delete(sessionId)

      // 更新账户会话记录
      const accountSessions = this.accountSessions.get(allocation.accountId)
      if (accountSessions) {
        accountSessions.delete(sessionId)
        if (accountSessions.size === 0) {
          this.accountSessions.delete(allocation.accountId)
        }
      }

      this.updateGlobalState()
      this.emit('sessionReleased', { sessionId, accountId: allocation.accountId })
    }
    catch (error) {
      this.emit('releaseError', { sessionId, error })
      throw error
    }
  }

  /**
   * 释放账户的所有会话
   */
  async releaseAccountSessions(accountId: string): Promise<void> {
    const sessionIds = Array.from(this.accountSessions.get(accountId) || [])

    await Promise.all(
      sessionIds.map(sessionId => this.releaseSession(sessionId)),
    )
  }

  /**
   * 获取账户会话数量
   */
  getAccountSessionCount(accountId: string): number {
    return this.accountSessions.get(accountId)?.size || 0
  }

  /**
   * 获取总会话数量
   */
  getTotalSessionCount(): number {
    return this.allocations.size
  }

  /**
   * 获取所有池的统计信息
   */
  getAllPoolStats(): Record<string, any> {
    const stats: Record<string, any> = {}

    for (const [poolName, pool] of this.pools) {
      stats[poolName] = pool.getStats()
    }

    return stats
  }

  /**
   * 获取会话分配信息
   */
  getAllocations(): SessionAllocation[] {
    return Array.from(this.allocations.values())
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    stats: Record<string, any>
  }> {
    const issues: string[] = []
    const stats = this.getAllPoolStats()

    // 检查会话限制
    const totalSessions = this.getTotalSessionCount()
    if (totalSessions > this.config.globalSessionLimit * 0.9) {
      issues.push(`接近全局会话限制: ${totalSessions}/${this.config.globalSessionLimit}`)
    }

    // 检查各个池的健康状态
    for (const [poolName, poolStats] of Object.entries(stats)) {
      if (poolStats.activeSessions === 0 && poolStats.totalSessions > 0) {
        issues.push(`池 ${poolName} 没有活跃会话但有总会话`)
      }
    }

    // 检查孤立的分配记录
    for (const [sessionId] of this.allocations) {
      const session = this.getSession(sessionId)
      if (!session) {
        issues.push(`发现孤立的分配记录: ${sessionId}`)
      }
    }

    return {
      healthy: issues.length === 0,
      issues,
      stats,
    }
  }

  /**
   * 清理所有会话
   */
  async cleanup(): Promise<void> {
    const allSessionIds = Array.from(this.allocations.keys())

    await Promise.all(
      allSessionIds.map(sessionId => this.releaseSession(sessionId)),
    )

    // 清理所有池
    for (const pool of this.pools.values()) {
      await pool.cleanupIdleSessions()
    }

    this.updateGlobalState()
    this.emit('cleanupCompleted')
  }

  /**
   * 销毁会话管理器
   */
  async destroy(): Promise<void> {
    // 关闭所有会话
    await this.cleanup()

    // 销毁所有池
    for (const pool of this.pools.values()) {
      await pool.destroy()
    }

    this.pools.clear()
    this.allocations.clear()
    this.accountSessions.clear()

    this.emit('destroyed')
  }

  /**
   * 处理会话创建事件
   */
  private handleSessionCreated(poolName: string, session: SessionInfo): void {
    this.updateGlobalState()
    this.emit('sessionCreated', { poolName, session })
  }

  /**
   * 处理会话关闭事件
   */
  private handleSessionClosed(poolName: string, data: { sessionId: string, accountId: string }): void {
    this.updateGlobalState()
    this.emit('sessionClosed', { poolName, ...data })
  }

  /**
   * 更新全局状态
   */
  private updateGlobalState(): void {
    if (!this.stateManager)
      return void 0

    // const totalSessions = this.getTotalSessionCount()
    // const activeSessions = Array.from(this.allocations.values())
    //   .filter(allocation => {
    //     const session = this.getSession(allocation.sessionId)
    //     return session?.isActive
    //   }).length

    // 暂时注释掉，等待StateManager实现相应方法
    // this.stateManager.updateAccountsState({
    //   activeSessionCount: activeSessions,
    //   totalAccounts: this.accountSessions.size
    // })
  }
}
