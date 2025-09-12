import type { Browser, BrowserContext, Page } from 'playwright'
import { EventEmitter } from 'node:events'
import { chromium, firefox, webkit } from 'playwright'

export interface BrowserSessionConfig {
  maxSessions: number
  sessionTimeout: number // 分钟
  headless: boolean
  userAgent?: string
  viewport?: { width: number, height: number }
  browserType: 'chromium' | 'firefox' | 'webkit'
  proxyConfig?: {
    server: string
    username?: string
    password?: string
  }
}

export interface SessionInfo {
  id: string
  accountId: string
  browser: Browser
  context: BrowserContext
  page: Page
  createdAt: Date
  lastActivity: Date
  isActive: boolean
  metadata: Record<string, any>
}

export interface SessionPoolStats {
  totalSessions: number
  activeSessions: number
  idleSessions: number
  peakSessions: number
  averageSessionTime: number
  totalSessionsCreated: number
}

export class BrowserSessionPool extends EventEmitter {
  private sessions: Map<string, SessionInfo> = new Map()
  private config: BrowserSessionConfig
  private cleanupInterval?: NodeJS.Timeout
  private stats: SessionPoolStats

  constructor(config: BrowserSessionConfig) {
    super()
    this.config = config
    this.stats = {
      totalSessions: 0,
      activeSessions: 0,
      idleSessions: 0,
      peakSessions: 0,
      averageSessionTime: 0,
      totalSessionsCreated: 0,
    }
    this.startCleanupTask()
  }

  /**
   * 创建新的浏览器会话
   */
  async createSession(accountId: string, metadata: Record<string, any> = {}): Promise<SessionInfo> {
    if (this.sessions.size >= this.config.maxSessions) {
      // 尝试清理空闲会话
      await this.cleanupIdleSessions()

      if (this.sessions.size >= this.config.maxSessions) {
        throw new Error(`已达到最大会话数限制: ${this.config.maxSessions}`)
      }
    }

    const sessionId = `session_${accountId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    try {
      // 选择浏览器引擎
      const browserType = this.getBrowserType()

      // 启动浏览器
      const browser = await browserType.launch({
        headless: this.config.headless,
        args: this.getBrowserArgs(),
      })

      // 创建上下文
      const context = await browser.newContext({
        userAgent: this.config.userAgent,
        viewport: this.config.viewport,
        proxy: this.config.proxyConfig,
      })

      // 创建页面
      const page = await context.newPage()

      const sessionInfo: SessionInfo = {
        id: sessionId,
        accountId,
        browser,
        context,
        page,
        createdAt: new Date(),
        lastActivity: new Date(),
        isActive: true,
        metadata,
      }

      this.sessions.set(sessionId, sessionInfo)
      this.updateStats()

      this.emit('sessionCreated', sessionInfo)

      return sessionInfo
    }
    catch (error) {
      this.emit('sessionError', { accountId, error })
      throw error
    }
  }

  /**
   * 获取会话信息
   */
  getSession(sessionId: string): SessionInfo | undefined {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivity = new Date()
      this.updateStats()
    }
    return session
  }

  /**
   * 获取账户的所有会话
   */
  getAccountSessions(accountId: string): SessionInfo[] {
    return Array.from(this.sessions.values()).filter(session => session.accountId === accountId)
  }

  /**
   * 关闭指定会话
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId)
    if (!session)
      return

    try {
      await session.browser.close()
      this.sessions.delete(sessionId)
      this.updateStats()
      this.emit('sessionClosed', { sessionId, accountId: session.accountId })
    }
    catch (error) {
      this.emit('sessionError', { sessionId, error })
      throw error
    }
  }

  /**
   * 关闭账户的所有会话
   */
  async closeAccountSessions(accountId: string): Promise<void> {
    const accountSessions = this.getAccountSessions(accountId)

    await Promise.all(
      accountSessions.map(session => this.closeSession(session.id)),
    )
  }

  /**
   * 清理空闲会话
   */
  async cleanupIdleSessions(): Promise<number> {
    const now = new Date()
    const timeoutMs = this.config.sessionTimeout * 60 * 1000
    const idleSessions: string[] = []

    for (const [sessionId, session] of this.sessions) {
      const idleTime = now.getTime() - session.lastActivity.getTime()
      if (idleTime > timeoutMs) {
        idleSessions.push(sessionId)
      }
    }

    await Promise.all(
      idleSessions.map(sessionId => this.closeSession(sessionId)),
    )

    if (idleSessions.length > 0) {
      this.emit('sessionsCleanedUp', { count: idleSessions.length })
    }

    return idleSessions.length
  }

  /**
   * 获取会话池统计信息
   */
  getStats(): SessionPoolStats {
    return { ...this.stats }
  }

  /**
   * 关闭所有会话并停止清理任务
   */
  async destroy(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }

    const allSessions = Array.from(this.sessions.keys())
    await Promise.all(
      allSessions.map(sessionId => this.closeSession(sessionId)),
    )

    this.emit('poolDestroyed')
  }

  /**
   * 获取浏览器引擎
   */
  private getBrowserType() {
    switch (this.config.browserType) {
      case 'firefox':
        return firefox
      case 'webkit':
        return webkit
      case 'chromium':
      default:
        return chromium
    }
  }

  /**
   * 获取浏览器启动参数
   */
  private getBrowserArgs(): string[] {
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ]

    if (this.config.proxyConfig) {
      args.push(`--proxy-server=${this.config.proxyConfig.server}`)
    }

    return args
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupIdleSessions().catch((error) => {
        this.emit('cleanupError', error)
      })
    }, 5 * 60 * 1000) // 每5分钟清理一次
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const totalSessions = this.sessions.size
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive).length
    const idleSessions = totalSessions - activeSessions

    this.stats.totalSessions = totalSessions
    this.stats.activeSessions = activeSessions
    this.stats.idleSessions = idleSessions
    this.stats.peakSessions = Math.max(this.stats.peakSessions, totalSessions)

    // 计算平均会话时间
    if (this.sessions.size > 0) {
      const totalTime = Array.from(this.sessions.values())
        .reduce((sum, session) => {
          return sum + (new Date().getTime() - session.createdAt.getTime())
        }, 0)
      this.stats.averageSessionTime = totalTime / this.sessions.size / 1000 / 60 // 转换为分钟
    }

    this.emit('statsUpdated', this.stats)
  }
}
