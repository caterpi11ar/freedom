import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export interface SystemConfig {
  version: string
  language: string
  theme: 'light' | 'dark'
  autoStart: boolean
  logLevel: 'debug' | 'info' | 'warn' | 'error'
  maxConcurrentSessions: number
  sessionTimeout: number
  autoCleanup: boolean
  lastUpdateCheck: Date
  telemetryEnabled: boolean
}

export interface AppPreferences {
  windowSize: {
    width: number
    height: number
  }
  windowPosition: {
    x: number
    y: number
  }
  alwaysOnTop: boolean
  startMinimized: boolean
  notificationsEnabled: boolean
  soundEnabled: boolean
  shortcuts: Record<string, string>
}

export interface GlobalConfig {
  system: SystemConfig
  preferences: AppPreferences
}

export class SystemConfigManager {
  private configDir: string
  private configFile: string
  private config: GlobalConfig | null = null

  constructor() {
    this.configDir = path.join(os.homedir(), '.freedom')
    this.configFile = path.join(this.configDir, 'config.json')
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

  private createDefaultConfig(): GlobalConfig {
    return {
      system: {
        version: '1.0.0',
        language: 'zh-CN',
        theme: 'dark',
        autoStart: false,
        logLevel: 'info',
        maxConcurrentSessions: 3,
        sessionTimeout: 3600000, // 1小时
        autoCleanup: true,
        lastUpdateCheck: new Date(),
        telemetryEnabled: false,
      },
      preferences: {
        windowSize: {
          width: 1200,
          height: 800,
        },
        windowPosition: {
          x: 100,
          y: 100,
        },
        alwaysOnTop: false,
        startMinimized: false,
        notificationsEnabled: true,
        soundEnabled: true,
        shortcuts: {
          toggle_window: 'Ctrl+Alt+F',
          quick_login: 'Ctrl+L',
          emergency_stop: 'Ctrl+Alt+S',
        },
      },
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(this.configFile, 'utf-8')
      const parsed = JSON.parse(data, this.dateReviver)

      // 合并默认配置与加载的配置
      const defaultConfig = this.createDefaultConfig()
      this.config = {
        system: { ...defaultConfig.system, ...parsed.system },
        preferences: { ...defaultConfig.preferences, ...parsed.preferences },
      }
    }
    catch (error) {
      console.warn('配置文件加载失败，使用默认配置:', error)
      this.config = this.createDefaultConfig()
      await this.saveConfig()
    }
  }

  async saveConfig(): Promise<void> {
    if (!this.config)
      return

    try {
      await fs.writeFile(
        this.configFile,
        JSON.stringify(this.config, this.dateReplacer, 2),
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

  // 系统配置方法
  getSystemConfig(): SystemConfig | null {
    return this.config?.system || null
  }

  async updateSystemConfig(updates: Partial<SystemConfig>): Promise<void> {
    if (!this.config)
      throw new Error('配置未初始化')

    this.config.system = { ...this.config.system, ...updates }
    await this.saveConfig()
  }

  // 应用偏好设置方法
  getPreferences(): AppPreferences | null {
    return this.config?.preferences || null
  }

  async updatePreferences(updates: Partial<AppPreferences>): Promise<void> {
    if (!this.config)
      throw new Error('配置未初始化')

    this.config.preferences = { ...this.config.preferences, ...updates }
    await this.saveConfig()
  }

  // 获取完整配置
  getGlobalConfig(): GlobalConfig | null {
    return this.config
  }

  // 重置配置
  async resetConfig(): Promise<void> {
    this.config = this.createDefaultConfig()
    await this.saveConfig()
  }

  // 配置验证
  validateConfig(): { isValid: boolean, issues: string[] } {
    if (!this.config) {
      return { isValid: false, issues: ['配置未初始化'] }
    }

    const issues: string[] = []
    const { system, preferences } = this.config

    // 验证系统配置
    if (system.maxConcurrentSessions < 1 || system.maxConcurrentSessions > 10) {
      issues.push('最大并发会话数应在1-10之间')
    }

    if (system.sessionTimeout < 300000 || system.sessionTimeout > 86400000) {
      issues.push('会话超时时间应在5分钟到24小时之间')
    }

    if (!['zh-CN', 'en-US'].includes(system.language)) {
      issues.push('不支持的语言设置')
    }

    // 验证偏好设置
    if (preferences.windowSize.width < 800 || preferences.windowSize.height < 600) {
      issues.push('窗口尺寸过小')
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  // 获取配置目录路径
  getConfigDirectory(): string {
    return this.configDir
  }

  // 创建配置备份
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupDir = path.join(this.configDir, 'backups')
    const backupFile = path.join(backupDir, `config-backup-${timestamp}.json`)

    await fs.mkdir(backupDir, { recursive: true })

    if (this.config) {
      await fs.writeFile(
        backupFile,
        JSON.stringify(this.config, this.dateReplacer, 2),
        'utf-8',
      )
    }

    return backupFile
  }

  // 恢复配置备份
  async restoreBackup(backupPath: string): Promise<void> {
    try {
      const data = await fs.readFile(backupPath, 'utf-8')
      const parsed = JSON.parse(data, this.dateReviver)

      this.config = parsed
      await this.saveConfig()
    }
    catch (error) {
      throw new Error(`恢复备份失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // 清理过期备份
  async cleanupOldBackups(keepDays: number = 30): Promise<void> {
    try {
      const backupDir = path.join(this.configDir, 'backups')
      const files = await fs.readdir(backupDir)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - keepDays)

      for (const file of files) {
        if (file.startsWith('config-backup-') && file.endsWith('.json')) {
          const filePath = path.join(backupDir, file)
          const stats = await fs.stat(filePath)

          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath)
          }
        }
      }
    }
    catch (error) {
      console.warn('清理备份文件时出错:', error)
    }
  }

  // 获取配置统计信息
  getConfigStats(): {
    configSize: number
    backupCount: number
    lastModified: Date | null
  } {
    return {
      configSize: this.config ? JSON.stringify(this.config).length : 0,
      backupCount: 0, // 可以异步获取
      lastModified: this.config?.system.lastUpdateCheck || null,
    }
  }
}

// 导出全局实例
export const systemConfigManager = new SystemConfigManager()
