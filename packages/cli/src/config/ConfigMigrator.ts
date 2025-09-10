// 配置迁移系统 - 处理配置版本升级和迁移
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import { ConfigurationError } from '../utils/errors.js'

export interface ConfigMigration {
  version: string
  description: string
  migrate: (config: any) => any
  validate?: (config: any) => boolean
}

export interface MigrationResult {
  success: boolean
  fromVersion: string
  toVersion: string
  changes: string[]
  errors?: string[]
}

export class ConfigMigrator {
  private migrations: Map<string, ConfigMigration> = new Map()
  private currentVersion = '1.0.0'
  private configPath: string
  private backupDir: string

  constructor() {
    this.configPath = path.join(process.cwd(), '.freedom', 'config.json')
    this.backupDir = path.join(process.cwd(), '.freedom', 'config-backups')
    this.setupMigrations()
  }

  /**
   * 设置内置迁移
   */
  private setupMigrations(): void {
    // 0.1.0 -> 1.0.0 迁移
    this.addMigration({
      version: '1.0.0',
      description: 'Upgrade to new configuration structure',
      migrate: (config: any) => {
        const migrated: any = { ...config }

        // 迁移游戏配置
        if (config.game?.defaultUrl) {
          migrated.game = {
            ...migrated.game,
            url: config.game.defaultUrl,
          }
          delete migrated.game.defaultUrl
        }

        // 迁移自动化配置
        if (config.automation?.retryCount !== undefined) {
          migrated.automation = {
            ...migrated.automation,
            retry: {
              count: config.automation.retryCount,
              delay: config.automation.retryDelay || 1000,
            },
          }
          delete migrated.automation.retryCount
          delete migrated.automation.retryDelay
        }

        // 添加新的默认配置
        if (!migrated.extensions) {
          migrated.extensions = {
            enabled: [],
            searchPaths: ['./extensions'],
          }
        }

        if (!migrated.logging) {
          migrated.logging = {
            level: 'info',
            file: true,
            console: true,
          }
        }

        return migrated
      },
      validate: (config: any) => {
        return config.game && config.automation && config.extensions && config.logging
      },
    })

    // 未来版本迁移占位符
    this.addMigration({
      version: '1.1.0',
      description: 'Add webhook configuration',
      migrate: (config: any) => {
        const migrated: any = { ...config }

        if (!migrated.webhooks) {
          migrated.webhooks = {
            enabled: false,
            endpoints: [],
          }
        }

        return migrated
      },
    })
  }

  /**
   * 添加迁移
   */
  addMigration(migration: ConfigMigration): void {
    this.migrations.set(migration.version, migration)
  }

  /**
   * 检查是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    try {
      const configExists = await this.configExists()
      if (!configExists) {
        return false // 新安装不需要迁移
      }

      const currentConfig = await this.loadCurrentConfig()
      const configVersion = currentConfig.version || '0.1.0'

      return this.compareVersions(configVersion, this.currentVersion) < 0
    }
    catch (error) {
      console.warn(chalk.yellow(`Warning: Could not check migration status: ${error instanceof Error ? error.message : 'Unknown error'}`))
      return false
    }
  }

  /**
   * 执行迁移
   */
  async migrate(): Promise<MigrationResult> {
    console.log(chalk.blue('🔄 Starting configuration migration...'))

    try {
      // 确保备份目录存在
      await mkdir(this.backupDir, { recursive: true })

      // 加载当前配置
      const currentConfig = await this.loadCurrentConfig()
      const fromVersion = currentConfig.version || '0.1.0'

      console.log(chalk.gray(`Migrating from version ${fromVersion} to ${this.currentVersion}`))

      // 创建备份
      await this.createBackup(currentConfig, fromVersion)

      // 执行迁移链
      const { migratedConfig, changes } = await this.executeMigrationChain(currentConfig, fromVersion)

      // 保存迁移后的配置
      migratedConfig.version = this.currentVersion
      await this.saveConfig(migratedConfig)

      const result: MigrationResult = {
        success: true,
        fromVersion,
        toVersion: this.currentVersion,
        changes,
      }

      console.log(chalk.green('✅ Configuration migration completed successfully'))
      console.log(chalk.gray(`Applied ${changes.length} change(s)`))

      return result
    }
    catch (error) {
      const migrationError = error instanceof Error ? error : new Error('Unknown error')
      console.error(chalk.red(`❌ Migration failed: ${migrationError.message}`))

      return {
        success: false,
        fromVersion: '0.1.0',
        toVersion: this.currentVersion,
        changes: [],
        errors: [migrationError.message],
      }
    }
  }

  /**
   * 执行迁移链
   */
  private async executeMigrationChain(
    config: any,
    fromVersion: string,
  ): Promise<{ migratedConfig: any, changes: string[] }> {
    let currentConfig = { ...config }
    const changes: string[] = []

    // 获取需要执行的迁移
    const migrationsToRun = this.getMigrationsToRun(fromVersion)

    for (const migration of migrationsToRun) {
      console.log(chalk.blue(`Applying migration: ${migration.version} - ${migration.description}`))

      try {
        const beforeConfig = JSON.stringify(currentConfig)
        currentConfig = migration.migrate(currentConfig)
        const afterConfig = JSON.stringify(currentConfig)

        // 验证迁移结果
        if (migration.validate && !migration.validate(currentConfig)) {
          throw new ConfigurationError(`Migration validation failed for version ${migration.version}`)
        }

        // 记录变更
        if (beforeConfig !== afterConfig) {
          changes.push(`${migration.version}: ${migration.description}`)
        }

        console.log(chalk.green(`✅ Applied migration ${migration.version}`))
      }
      catch (error) {
        const migrationError = error instanceof Error ? error : new Error('Unknown error')
        throw new ConfigurationError(`Migration ${migration.version} failed: ${migrationError.message}`)
      }
    }

    return { migratedConfig: currentConfig, changes }
  }

  /**
   * 获取需要执行的迁移
   */
  private getMigrationsToRun(fromVersion: string): ConfigMigration[] {
    const migrations: ConfigMigration[] = []

    for (const [version, migration] of this.migrations) {
      if (this.compareVersions(fromVersion, version) < 0
        && this.compareVersions(version, this.currentVersion) <= 0) {
        migrations.push(migration)
      }
    }

    // 按版本排序
    return migrations.sort((a, b) => this.compareVersions(a.version, b.version))
  }

  /**
   * 创建配置备份
   */
  private async createBackup(config: any, version: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `config_${version}_${timestamp}.json`
    const backupPath = path.join(this.backupDir, backupName)

    await writeFile(backupPath, JSON.stringify(config, null, 2))
    console.log(chalk.green(`💾 Created backup: ${backupPath}`))
  }

  /**
   * 检查配置文件是否存在
   */
  private async configExists(): Promise<boolean> {
    try {
      await stat(this.configPath)
      return true
    }
    catch {
      return false
    }
  }

  /**
   * 加载当前配置
   */
  private async loadCurrentConfig(): Promise<any> {
    try {
      const configContent = await readFile(this.configPath, 'utf-8')
      return JSON.parse(configContent)
    }
    catch (error) {
      throw new ConfigurationError(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 保存配置
   */
  private async saveConfig(config: any): Promise<void> {
    try {
      const configDir = path.dirname(this.configPath)
      await mkdir(configDir, { recursive: true })
      await writeFile(this.configPath, JSON.stringify(config, null, 2))
    }
    catch (error) {
      throw new ConfigurationError(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 版本比较 (简单实现)
   */
  private compareVersions(a: string, b: string): number {
    const parseVersion = (version: string) => {
      return version.split('.').map(v => Number.parseInt(v, 10))
    }

    const versionA = parseVersion(a)
    const versionB = parseVersion(b)

    for (let i = 0; i < Math.max(versionA.length, versionB.length); i++) {
      const numA = versionA[i] || 0
      const numB = versionB[i] || 0

      if (numA < numB)
        return -1
      if (numA > numB)
        return 1
    }

    return 0
  }

  /**
   * 恢复备份
   */
  async restoreBackup(backupName: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, backupName)
      const backupContent = await readFile(backupPath, 'utf-8')
      const backupConfig = JSON.parse(backupContent)

      await this.saveConfig(backupConfig)
      console.log(chalk.green(`✅ Restored configuration from backup: ${backupName}`))
    }
    catch (error) {
      const restoreError = error instanceof Error ? error : new Error('Unknown error')
      throw new ConfigurationError(`Failed to restore backup: ${restoreError.message}`)
    }
  }

  /**
   * 列出可用备份
   */
  async listBackups(): Promise<string[]> {
    try {
      const { readdir } = await import('node:fs/promises')
      const files = await readdir(this.backupDir)
      return files.filter(file => file.endsWith('.json') && file.startsWith('config_'))
    }
    catch {
      return []
    }
  }

  /**
   * 获取当前配置版本
   */
  getCurrentVersion(): string {
    return this.currentVersion
  }

  /**
   * 设置配置路径
   */
  setConfigPath(configPath: string): void {
    this.configPath = configPath
  }

  /**
   * 验证配置结构
   */
  async validateConfig(config?: any): Promise<{ valid: boolean, errors: string[] }> {
    try {
      const configToValidate = config || await this.loadCurrentConfig()
      const errors: string[] = []

      // 基本结构检查
      if (!configToValidate.game) {
        errors.push('Missing game configuration')
      }

      if (!configToValidate.automation) {
        errors.push('Missing automation configuration')
      }

      if (!configToValidate.version) {
        errors.push('Missing version field')
      }

      // 版本检查
      if (configToValidate.version && this.compareVersions(configToValidate.version, this.currentVersion) > 0) {
        errors.push(`Configuration version ${configToValidate.version} is newer than supported version ${this.currentVersion}`)
      }

      return {
        valid: errors.length === 0,
        errors,
      }
    }
    catch (error) {
      return {
        valid: false,
        errors: [`Failed to validate configuration: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    }
  }
}
