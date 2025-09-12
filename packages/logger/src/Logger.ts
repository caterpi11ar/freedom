import { EventEmitter } from 'node:events'
import { mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
  FATAL = 5,
}

export interface LogEntry {
  timestamp: Date
  level: LogLevel
  message: string
  context?: string
  metadata?: Record<string, any>
  error?: Error
  sessionId?: string
  accountId?: string
}

export interface LoggerConfig {
  level: LogLevel
  outputs: LogOutput[]
  contextName?: string
  includeTimestamp: boolean
  includeLevel: boolean
  includeContext: boolean
  maxLogSize: number // bytes
  maxLogFiles: number
  logRotation: boolean
}

export interface LogOutput {
  type: 'console' | 'file' | 'custom'
  path?: string
  formatter?: LogFormatter
  filter?: LogFilter
  enabled: boolean
}

export type LogFormatter = (entry: LogEntry) => string
export type LogFilter = (entry: LogEntry) => boolean

const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.FATAL]: 'FATAL',
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: '\x1B[90m', // gray
  [LogLevel.DEBUG]: '\x1B[36m', // cyan
  [LogLevel.INFO]: '\x1B[32m', // green
  [LogLevel.WARN]: '\x1B[33m', // yellow
  [LogLevel.ERROR]: '\x1B[31m', // red
  [LogLevel.FATAL]: '\x1B[35m', // magenta
}

export class Logger extends EventEmitter {
  private config: LoggerConfig
  private logBuffer: LogEntry[] = []
  private flushTimer?: NodeJS.Timeout

  constructor(config: Partial<LoggerConfig> = {}) {
    super()

    this.config = {
      level: LogLevel.INFO,
      outputs: [
        {
          type: 'console',
          enabled: true,
          formatter: this.defaultConsoleFormatter.bind(this),
        },
      ],
      includeTimestamp: true,
      includeLevel: true,
      includeContext: true,
      maxLogSize: 10 * 1024 * 1024, // 10MB
      maxLogFiles: 5,
      logRotation: true,
      ...config,
    }

    this.startFlushTimer()
  }

  /**
   * 记录 TRACE 级别日志
   */
  trace(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.TRACE, message, metadata)
  }

  /**
   * 记录 DEBUG 级别日志
   */
  debug(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, metadata)
  }

  /**
   * 记录 INFO 级别日志
   */
  info(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, metadata)
  }

  /**
   * 记录 WARN 级别日志
   */
  warn(message: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, metadata)
  }

  /**
   * 记录 ERROR 级别日志
   */
  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, metadata, error)
  }

  /**
   * 记录 FATAL 级别日志
   */
  fatal(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, metadata, error)
  }

  /**
   * 核心日志记录方法
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
  ): void {
    if (level < this.config.level) {
      return
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.config.contextName,
      metadata,
      error,
    }

    this.processLogEntry(entry)
  }

  /**
   * 处理日志条目
   */
  private async processLogEntry(entry: LogEntry): Promise<void> {
    // 添加到缓冲区
    this.logBuffer.push(entry)

    // 触发事件
    this.emit('log', entry)

    // 处理各种输出
    for (const output of this.config.outputs) {
      if (!output.enabled)
        continue

      // 应用过滤器
      if (output.filter && !output.filter(entry))
        continue

      await this.writeToOutput(entry, output)
    }
  }

  /**
   * 写入到指定输出
   */
  private async writeToOutput(entry: LogEntry, output: LogOutput): Promise<void> {
    const formatted = output.formatter ? output.formatter(entry) : this.defaultFormatter(entry)

    switch (output.type) {
      case 'console':
        console.log(formatted)
        break

      case 'file':
        if (output.path) {
          await this.writeToFile(formatted, output.path)
        }
        break

      case 'custom':
        this.emit('customOutput', { entry, formatted, output })
        break
    }
  }

  /**
   * 写入文件
   */
  private async writeToFile(content: string, filePath: string): Promise<void> {
    try {
      // 确保目录存在
      await mkdir(dirname(filePath), { recursive: true })

      // 检查文件大小和轮转
      if (this.config.logRotation) {
        await this.rotateLogIfNeeded(filePath)
      }

      // 写入文件
      await writeFile(filePath, `${content}\n`, { flag: 'a' })
    }
    catch (error) {
      this.emit('writeError', { filePath, error })
    }
  }

  /**
   * 日志轮转
   */
  private async rotateLogIfNeeded(filePath: string): Promise<void> {
    try {
      const stats = await stat(filePath)

      if (stats.size >= this.config.maxLogSize) {
        // 轮转日志文件
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
        const rotatedPath = `${filePath}.${timestamp}`

        await writeFile(rotatedPath, await readdir(filePath))
        await writeFile(filePath, '')

        // 清理旧的日志文件
        await this.cleanupOldLogs(dirname(filePath))
      }
    }
    catch (error) {
      // 文件不存在时忽略错误
      if ((error as any).code !== 'ENOENT') {
        this.emit('rotationError', { filePath, error })
      }
    }
  }

  /**
   * 清理旧的日志文件
   */
  private async cleanupOldLogs(logDir: string): Promise<void> {
    try {
      const files = await readdir(logDir)
      const logFiles = files
        .filter(file => file.includes('.log.'))
        .map(file => ({
          name: file,
          path: join(logDir, file),
          created: this.extractTimestampFromFilename(file),
        }))
        .sort((a, b) => b.created.getTime() - a.created.getTime())

      // 删除超出数量限制的文件
      if (logFiles.length > this.config.maxLogFiles) {
        const filesToDelete = logFiles.slice(this.config.maxLogFiles)

        for (const file of filesToDelete) {
          await writeFile(file.path, '') // 简单清空文件内容
        }
      }
    }
    catch (error) {
      this.emit('cleanupError', { logDir, error })
    }
  }

  /**
   * 从文件名提取时间戳
   */
  private extractTimestampFromFilename(filename: string): Date {
    const match = filename.match(/\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)/)
    if (match) {
      return new Date(match[1].replace(/-/g, ':').replace(/T(\d{2}):(\d{2}):(\d{2}):/, 'T$1:$2:$3.'))
    }
    return new Date(0)
  }

  /**
   * 默认控制台格式化器
   */
  private defaultConsoleFormatter(entry: LogEntry): string {
    const color = LOG_LEVEL_COLORS[entry.level]
    const reset = '\x1B[0m'

    let output = ''

    if (this.config.includeTimestamp) {
      output += `${color}[${entry.timestamp.toISOString()}]${reset} `
    }

    if (this.config.includeLevel) {
      output += `${color}${LOG_LEVEL_NAMES[entry.level]}${reset} `
    }

    if (this.config.includeContext && entry.context) {
      output += `${color}[${entry.context}]${reset} `
    }

    output += entry.message

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += ` ${JSON.stringify(entry.metadata)}`
    }

    if (entry.error) {
      output += `\n${entry.error.stack || entry.error.message}`
    }

    return output
  }

  /**
   * 默认格式化器（用于文件输出）
   */
  private defaultFormatter(entry: LogEntry): string {
    const parts = []

    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp.toISOString()}]`)
    }

    if (this.config.includeLevel) {
      parts.push(LOG_LEVEL_NAMES[entry.level])
    }

    if (this.config.includeContext && entry.context) {
      parts.push(`[${entry.context}]`)
    }

    parts.push(entry.message)

    let output = parts.join(' ')

    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      output += ` ${JSON.stringify(entry.metadata)}`
    }

    if (entry.error) {
      output += `\n${entry.error.stack || entry.error.message}`
    }

    return output
  }

  /**
   * 启动刷新计时器
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, 1000) // 每秒刷新一次
  }

  /**
   * 刷新日志缓冲区
   */
  flush(): void {
    if (this.logBuffer.length > 0) {
      this.emit('flush', [...this.logBuffer])
      this.logBuffer = []
    }
  }

  /**
   * 创建子Logger
   */
  child(contextName: string, additionalConfig?: Partial<LoggerConfig>): Logger {
    return new Logger({
      ...this.config,
      contextName,
      ...additionalConfig,
    })
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...updates }
  }

  /**
   * 销毁Logger
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flush()
    this.removeAllListeners()
  }
}
