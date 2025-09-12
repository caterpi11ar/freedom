import type { LogEntry, LoggerConfig } from './Logger'
import { EventEmitter } from 'node:events'
import { Logger, LogLevel } from './Logger'

export interface LoggerManagerConfig {
  defaultLevel: LogLevel
  defaultOutputs: Array<{
    type: 'console' | 'file' | 'custom'
    path?: string
    enabled: boolean
  }>
  logDirectory: string
  globalConfig: Partial<LoggerConfig>
}

export interface LoggerContext {
  name: string
  logger: Logger
  createdAt: Date
  lastUsed: Date
  entryCount: number
}

export class LoggerManager extends EventEmitter {
  private loggers: Map<string, LoggerContext> = new Map()
  private config: LoggerManagerConfig
  private globalLogger: Logger

  constructor(config: Partial<LoggerManagerConfig> = {}) {
    super()

    this.config = {
      defaultLevel: LogLevel.INFO,
      defaultOutputs: [
        {
          type: 'console',
          enabled: true,
        },
      ],
      logDirectory: './logs',
      globalConfig: {},
      ...config,
    }

    // 创建全局Logger
    this.globalLogger = new Logger({
      level: this.config.defaultLevel,
      outputs: this.config.defaultOutputs,
      contextName: 'GLOBAL',
      ...this.config.globalConfig,
    })

    this.setupGlobalLoggerEvents()
  }

  /**
   * 获取或创建Logger
   */
  getLogger(name: string, config?: Partial<LoggerConfig>): Logger {
    const existing = this.loggers.get(name)

    if (existing) {
      existing.lastUsed = new Date()
      return existing.logger
    }

    // 创建新的Logger
    const logger = new Logger({
      level: this.config.defaultLevel,
      outputs: this.createOutputsForLogger(name),
      contextName: name,
      ...this.config.globalConfig,
      ...config,
    })

    const context: LoggerContext = {
      name,
      logger,
      createdAt: new Date(),
      lastUsed: new Date(),
      entryCount: 0,
    }

    // 设置Logger事件监听
    this.setupLoggerEvents(context)

    this.loggers.set(name, context)
    this.emit('loggerCreated', { name, logger })

    return logger
  }

  /**
   * 获取全局Logger
   */
  getGlobalLogger(): Logger {
    return this.globalLogger
  }

  /**
   * 为特定Logger创建输出配置
   */
  private createOutputsForLogger(name: string) {
    return this.config.defaultOutputs.map((output) => {
      if (output.type === 'file') {
        return {
          ...output,
          path: output.path || `${this.config.logDirectory}/${name}.log`,
        }
      }
      return output
    })
  }

  /**
   * 设置Logger事件监听
   */
  private setupLoggerEvents(context: LoggerContext): void {
    context.logger.on('log', (entry: LogEntry) => {
      context.entryCount++
      context.lastUsed = new Date()
      this.emit('logEntry', { loggerName: context.name, entry })
    })

    context.logger.on('error', (error: any) => {
      this.emit('loggerError', { loggerName: context.name, error })
    })
  }

  /**
   * 设置全局Logger事件监听
   */
  private setupGlobalLoggerEvents(): void {
    this.globalLogger.on('log', (entry: LogEntry) => {
      this.emit('globalLogEntry', entry)
    })

    this.globalLogger.on('error', (error: any) => {
      this.emit('globalLoggerError', error)
    })
  }

  /**
   * 获取所有Logger的状态
   */
  getLoggersStatus(): Array<{
    name: string
    createdAt: Date
    lastUsed: Date
    entryCount: number
    isActive: boolean
  }> {
    const now = new Date()
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

    return Array.from(this.loggers.values()).map(context => ({
      name: context.name,
      createdAt: context.createdAt,
      lastUsed: context.lastUsed,
      entryCount: context.entryCount,
      isActive: context.lastUsed > fiveMinutesAgo,
    }))
  }

  /**
   * 批量设置Logger级别
   */
  setLogLevel(level: LogLevel, loggerNames?: string[]): void {
    if (loggerNames) {
      // 设置指定Logger的级别
      for (const name of loggerNames) {
        const context = this.loggers.get(name)
        if (context) {
          context.logger.updateConfig({ level })
        }
      }
    }
    else {
      // 设置所有Logger的级别
      this.globalLogger.updateConfig({ level })

      for (const context of this.loggers.values()) {
        context.logger.updateConfig({ level })
      }

      this.config.defaultLevel = level
    }

    this.emit('logLevelChanged', { level, loggerNames })
  }

  /**
   * 启用或禁用控制台输出
   */
  setConsoleOutput(enabled: boolean, loggerNames?: string[]): void {
    const updateOutputs = (logger: Logger) => {
      const config = (logger as any).config as LoggerConfig
      const outputs = config.outputs.map(output => ({
        ...output,
        enabled: output.type === 'console' ? enabled : output.enabled,
      }))
      logger.updateConfig({ outputs })
    }

    if (loggerNames) {
      for (const name of loggerNames) {
        const context = this.loggers.get(name)
        if (context) {
          updateOutputs(context.logger)
        }
      }
    }
    else {
      updateOutputs(this.globalLogger)

      for (const context of this.loggers.values()) {
        updateOutputs(context.logger)
      }
    }

    this.emit('consoleOutputChanged', { enabled, loggerNames })
  }

  /**
   * 添加全局日志输出
   */
  addGlobalOutput(output: {
    type: 'console' | 'file' | 'custom'
    path?: string
    enabled: boolean
  }): void {
    this.config.defaultOutputs.push(output)

    // 为所有现有Logger添加此输出
    for (const context of this.loggers.values()) {
      const config = (context.logger as any).config as LoggerConfig
      const newOutput = output.type === 'file' && !output.path
        ? { ...output, path: `${this.config.logDirectory}/${context.name}.log` }
        : output

      config.outputs.push(newOutput)
      context.logger.updateConfig({ outputs: config.outputs })
    }

    this.emit('globalOutputAdded', output)
  }

  /**
   * 清理不活跃的Logger
   */
  cleanupInactiveLoggers(maxIdleTime: number = 30 * 60 * 1000): number { // 默认30分钟
    const now = new Date()
    const inactiveLoggers: string[] = []

    for (const [name, context] of this.loggers) {
      const idleTime = now.getTime() - context.lastUsed.getTime()
      if (idleTime > maxIdleTime) {
        inactiveLoggers.push(name)
      }
    }

    // 销毁不活跃的Logger
    for (const name of inactiveLoggers) {
      const context = this.loggers.get(name)
      if (context) {
        context.logger.destroy()
        this.loggers.delete(name)
      }
    }

    if (inactiveLoggers.length > 0) {
      this.emit('inactiveLoggersCleanedUp', { count: inactiveLoggers.length, loggers: inactiveLoggers })
    }

    return inactiveLoggers.length
  }

  /**
   * 获取日志统计信息
   */
  getLogStatistics(): {
    totalLoggers: number
    activeLoggers: number
    totalLogEntries: number
    averageEntriesPerLogger: number
    oldestLogger?: string
    mostActiveLogger?: string
  } {
    const loggers = Array.from(this.loggers.values())
    const totalLoggers = loggers.length
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const activeLoggers = loggers.filter(ctx => ctx.lastUsed > fiveMinutesAgo).length
    const totalLogEntries = loggers.reduce((sum, ctx) => sum + ctx.entryCount, 0)

    let oldestLogger: string | undefined
    let mostActiveLogger: string | undefined
    let oldestTime = Date.now()
    let maxEntries = 0

    for (const context of loggers) {
      if (context.createdAt.getTime() < oldestTime) {
        oldestTime = context.createdAt.getTime()
        oldestLogger = context.name
      }

      if (context.entryCount > maxEntries) {
        maxEntries = context.entryCount
        mostActiveLogger = context.name
      }
    }

    return {
      totalLoggers,
      activeLoggers,
      totalLogEntries,
      averageEntriesPerLogger: totalLoggers > 0 ? totalLogEntries / totalLoggers : 0,
      oldestLogger,
      mostActiveLogger,
    }
  }

  /**
   * 刷新所有Logger
   */
  flushAll(): void {
    this.globalLogger.flush()

    for (const context of this.loggers.values()) {
      context.logger.flush()
    }

    this.emit('allLoggersFlushed')
  }

  /**
   * 销毁管理器和所有Logger
   */
  async destroy(): Promise<void> {
    // 销毁全局Logger
    this.globalLogger.destroy()

    // 销毁所有Logger
    for (const context of this.loggers.values()) {
      context.logger.destroy()
    }

    this.loggers.clear()
    this.removeAllListeners()

    this.emit('destroyed')
  }
}
