// 配置同步和备份系统 - 处理配置的云同步和本地备份
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import { ConfigurationError } from '../utils/errors.js'

export interface SyncProfile {
  id: string
  name: string
  type: 'local' | 'git' | 'cloud'
  enabled: boolean
  config: {
    // Local sync
    path?: string
    // Git sync
    repository?: string
    branch?: string
    token?: string
    // Cloud sync
    provider?: 'github' | 'gitlab' | 'custom'
    endpoint?: string
    credentials?: string
  }
  lastSync?: Date
  conflicts?: ConfigConflict[]
}

export interface ConfigConflict {
  key: string
  localValue: any
  remoteValue: any
  timestamp: Date
  resolved?: boolean
  resolution?: 'local' | 'remote' | 'merge'
}

export interface BackupEntry {
  id: string
  timestamp: Date
  description: string
  size: number
  version: string
  automatic: boolean
  tags?: string[]
}

export interface SyncResult {
  success: boolean
  conflicts: ConfigConflict[]
  changes: string[]
  errors?: string[]
}

export class ConfigSync {
  private configPath: string
  private backupDir: string
  private syncDir: string
  private profilesPath: string
  private maxBackups = 50

  constructor() {
    const freedomDir = path.join(process.cwd(), '.freedom')
    this.configPath = path.join(freedomDir, 'config.json')
    this.backupDir = path.join(freedomDir, 'backups')
    this.syncDir = path.join(freedomDir, 'sync')
    this.profilesPath = path.join(freedomDir, 'sync-profiles.json')
  }

  /**
   * 初始化同步系统
   */
  async initialize(): Promise<void> {
    await mkdir(this.backupDir, { recursive: true })
    await mkdir(this.syncDir, { recursive: true })

    // 创建默认同步配置
    if (!await this.fileExists(this.profilesPath)) {
      const defaultProfiles: SyncProfile[] = [
        {
          id: 'local-backup',
          name: 'Local Automatic Backup',
          type: 'local',
          enabled: true,
          config: {
            path: this.backupDir,
          },
        },
      ]
      await this.saveProfiles(defaultProfiles)
    }
  }

  /**
   * 创建配置备份
   */
  async createBackup(description?: string, tags: string[] = []): Promise<BackupEntry> {
    try {
      const config = await this.loadConfig()
      const timestamp = new Date()
      const id = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}`

      const backupEntry: BackupEntry = {
        id,
        timestamp,
        description: description || `Automatic backup - ${timestamp.toLocaleDateString()}`,
        size: JSON.stringify(config).length,
        version: config.version || '1.0.0',
        automatic: !description,
        tags,
      }

      // 保存备份文件
      const backupPath = path.join(this.backupDir, `${id}.json`)
      const backupData = {
        meta: backupEntry,
        config,
      }

      await writeFile(backupPath, JSON.stringify(backupData, null, 2))

      // 清理旧备份
      await this.cleanupOldBackups()

      console.log(chalk.green(`💾 Created backup: ${id}`))
      return backupEntry
    }
    catch (error) {
      const backupError = error instanceof Error ? error : new Error('Unknown error')
      throw new ConfigurationError(`Failed to create backup: ${backupError.message}`)
    }
  }

  /**
   * 恢复配置备份
   */
  async restoreBackup(backupId: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, `${backupId}.json`)
      const backupContent = await readFile(backupPath, 'utf-8')
      const backupData = JSON.parse(backupContent)

      if (!backupData.config) {
        throw new ConfigurationError('Invalid backup format')
      }

      // 创建当前配置的备份
      await this.createBackup(`Before restoring ${backupId}`, ['restore-point'])

      // 恢复配置
      await this.saveConfig(backupData.config)

      console.log(chalk.green(`✅ Restored configuration from backup: ${backupId}`))
    }
    catch (error) {
      const restoreError = error instanceof Error ? error : new Error('Unknown error')
      throw new ConfigurationError(`Failed to restore backup: ${restoreError.message}`)
    }
  }

  /**
   * 列出所有备份
   */
  async listBackups(): Promise<BackupEntry[]> {
    try {
      const files = await readdir(this.backupDir)
      const backups: BackupEntry[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const backupPath = path.join(this.backupDir, file)
            const backupContent = await readFile(backupPath, 'utf-8')
            const backupData = JSON.parse(backupContent)

            if (backupData.meta) {
              backups.push({
                ...backupData.meta,
                timestamp: new Date(backupData.meta.timestamp),
              })
            }
          }
          catch {
            // 忽略损坏的备份文件
          }
        }
      }

      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }
    catch {
      return []
    }
  }

  /**
   * 删除备份
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backupPath = path.join(this.backupDir, `${backupId}.json`)
      await rm(backupPath)
      console.log(chalk.green(`🗑️  Deleted backup: ${backupId}`))
    }
    catch (error) {
      const deleteError = error instanceof Error ? error : new Error('Unknown error')
      throw new ConfigurationError(`Failed to delete backup: ${deleteError.message}`)
    }
  }

  /**
   * 同步配置到远程
   */
  async syncToRemote(profileId: string): Promise<SyncResult> {
    try {
      const profiles = await this.loadProfiles()
      const profile = profiles.find(p => p.id === profileId)

      if (!profile) {
        throw new ConfigurationError(`Sync profile not found: ${profileId}`)
      }

      if (!profile.enabled) {
        throw new ConfigurationError(`Sync profile is disabled: ${profileId}`)
      }

      console.log(chalk.blue(`🔄 Syncing to ${profile.name}...`))

      const config = await this.loadConfig()
      const changes: string[] = []

      switch (profile.type) {
        case 'local':
          await this.syncToLocal(profile, config, changes)
          break
        case 'git':
          await this.syncToGit(profile, config, changes)
          break
        case 'cloud':
          await this.syncToCloud(profile, config, changes)
          break
      }

      // 更新同步时间
      profile.lastSync = new Date()
      await this.updateProfile(profile)

      console.log(chalk.green(`✅ Sync completed: ${changes.length} change(s)`))

      return {
        success: true,
        conflicts: [],
        changes,
      }
    }
    catch (error) {
      const syncError = error instanceof Error ? error : new Error('Unknown error')
      return {
        success: false,
        conflicts: [],
        changes: [],
        errors: [syncError.message],
      }
    }
  }

  /**
   * 从远程同步配置
   */
  async syncFromRemote(profileId: string): Promise<SyncResult> {
    try {
      const profiles = await this.loadProfiles()
      const profile = profiles.find(p => p.id === profileId)

      if (!profile) {
        throw new ConfigurationError(`Sync profile not found: ${profileId}`)
      }

      console.log(chalk.blue(`🔄 Syncing from ${profile.name}...`))

      let remoteConfig: any
      const changes: string[] = []
      const conflicts: ConfigConflict[] = []

      switch (profile.type) {
        case 'local':
          remoteConfig = await this.syncFromLocal(profile, changes)
          break
        case 'git':
          remoteConfig = await this.syncFromGit(profile, changes)
          break
        case 'cloud':
          remoteConfig = await this.syncFromCloud(profile, changes)
          break
      }

      if (remoteConfig) {
        // 检查冲突
        const localConfig = await this.loadConfig()
        const detectedConflicts = this.detectConflicts(localConfig, remoteConfig)

        if (detectedConflicts.length > 0) {
          conflicts.push(...detectedConflicts)
          console.log(chalk.yellow(`⚠️  Detected ${conflicts.length} conflict(s)`))

          // 自动解决简单冲突
          const resolvedConfig = this.resolveConflicts(localConfig, remoteConfig, conflicts)
          await this.saveConfig(resolvedConfig)
          changes.push('Resolved configuration conflicts')
        }
        else {
          await this.saveConfig(remoteConfig)
        }

        // 更新同步时间
        profile.lastSync = new Date()
        await this.updateProfile(profile)
      }

      console.log(chalk.green(`✅ Sync completed: ${changes.length} change(s), ${conflicts.length} conflict(s)`))

      return {
        success: true,
        conflicts,
        changes,
      }
    }
    catch (error) {
      const syncError = error instanceof Error ? error : new Error('Unknown error')
      return {
        success: false,
        conflicts: [],
        changes: [],
        errors: [syncError.message],
      }
    }
  }

  /**
   * 本地同步实现
   */
  private async syncToLocal(profile: SyncProfile, config: any, changes: string[]): Promise<void> {
    if (!profile.config.path) {
      throw new ConfigurationError('Local sync path not configured')
    }

    const syncPath = path.join(profile.config.path, 'config-sync.json')
    await writeFile(syncPath, JSON.stringify(config, null, 2))
    changes.push(`Saved to ${syncPath}`)
  }

  private async syncFromLocal(profile: SyncProfile, changes: string[]): Promise<any> {
    if (!profile.config.path) {
      throw new ConfigurationError('Local sync path not configured')
    }

    const syncPath = path.join(profile.config.path, 'config-sync.json')
    const syncContent = await readFile(syncPath, 'utf-8')
    changes.push(`Loaded from ${syncPath}`)
    return JSON.parse(syncContent)
  }

  /**
   * Git同步实现（模拟）
   */
  private async syncToGit(_profile: SyncProfile, _config: any, changes: string[]): Promise<void> {
    // TODO: 实现Git同步
    console.log(chalk.yellow('⚠️  Git sync not yet implemented'))
    changes.push('Git sync placeholder')
  }

  private async syncFromGit(_profile: SyncProfile, changes: string[]): Promise<any> {
    // TODO: 实现Git同步
    console.log(chalk.yellow('⚠️  Git sync not yet implemented'))
    changes.push('Git sync placeholder')
    return null
  }

  /**
   * 云同步实现（模拟）
   */
  private async syncToCloud(_profile: SyncProfile, _config: any, changes: string[]): Promise<void> {
    // TODO: 实现云同步
    console.log(chalk.yellow('⚠️  Cloud sync not yet implemented'))
    changes.push('Cloud sync placeholder')
  }

  private async syncFromCloud(_profile: SyncProfile, changes: string[]): Promise<any> {
    // TODO: 实现云同步
    console.log(chalk.yellow('⚠️  Cloud sync not yet implemented'))
    changes.push('Cloud sync placeholder')
    return null
  }

  /**
   * 检测配置冲突
   */
  private detectConflicts(localConfig: any, remoteConfig: any): ConfigConflict[] {
    const conflicts: ConfigConflict[] = []
    const timestamp = new Date()

    const checkObject = (local: any, remote: any, keyPath: string = '') => {
      for (const key in remote) {
        const fullKey = keyPath ? `${keyPath}.${key}` : key

        if (local[key] !== undefined && remote[key] !== undefined) {
          if (typeof local[key] === 'object' && typeof remote[key] === 'object') {
            checkObject(local[key], remote[key], fullKey)
          }
          else if (local[key] !== remote[key]) {
            conflicts.push({
              key: fullKey,
              localValue: local[key],
              remoteValue: remote[key],
              timestamp,
            })
          }
        }
      }
    }

    checkObject(localConfig, remoteConfig)
    return conflicts
  }

  /**
   * 解决配置冲突
   */
  private resolveConflicts(_localConfig: any, remoteConfig: any, conflicts: ConfigConflict[]): any {
    const resolved = { ...remoteConfig }

    // 简单的冲突解决策略：优先使用更新的值
    for (const conflict of conflicts) {
      const keyParts = conflict.key.split('.')
      let current = resolved

      for (let i = 0; i < keyParts.length - 1; i++) {
        current = current[keyParts[i]]
      }

      const lastKey = keyParts[keyParts.length - 1]

      // 使用本地值（保守策略）
      current[lastKey] = conflict.localValue
      conflict.resolved = true
      conflict.resolution = 'local'
    }

    return resolved
  }

  /**
   * 工具方法
   */
  private async loadConfig(): Promise<any> {
    const content = await readFile(this.configPath, 'utf-8')
    return JSON.parse(content)
  }

  private async saveConfig(config: any): Promise<void> {
    await writeFile(this.configPath, JSON.stringify(config, null, 2))
  }

  private async loadProfiles(): Promise<SyncProfile[]> {
    try {
      const content = await readFile(this.profilesPath, 'utf-8')
      return JSON.parse(content)
    }
    catch {
      return []
    }
  }

  private async saveProfiles(profiles: SyncProfile[]): Promise<void> {
    await writeFile(this.profilesPath, JSON.stringify(profiles, null, 2))
  }

  private async updateProfile(profile: SyncProfile): Promise<void> {
    const profiles = await this.loadProfiles()
    const index = profiles.findIndex(p => p.id === profile.id)
    if (index >= 0) {
      profiles[index] = profile
      await this.saveProfiles(profiles)
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await stat(filePath)
      return true
    }
    catch {
      return false
    }
  }

  private async cleanupOldBackups(): Promise<void> {
    const backups = await this.listBackups()
    if (backups.length > this.maxBackups) {
      const toDelete = backups.slice(this.maxBackups)
      for (const backup of toDelete) {
        if (backup.automatic) { // 只删除自动备份
          await this.deleteBackup(backup.id)
        }
      }
    }
  }

  /**
   * 公共接口
   */
  async addSyncProfile(profile: Omit<SyncProfile, 'id'>): Promise<string> {
    const profiles = await this.loadProfiles()
    const id = `profile_${Date.now()}`
    const newProfile: SyncProfile = { ...profile, id }

    profiles.push(newProfile)
    await this.saveProfiles(profiles)

    return id
  }

  async removeSyncProfile(profileId: string): Promise<void> {
    const profiles = await this.loadProfiles()
    const filteredProfiles = profiles.filter(p => p.id !== profileId)
    await this.saveProfiles(filteredProfiles)
  }

  async getSyncProfiles(): Promise<SyncProfile[]> {
    return this.loadProfiles()
  }
}
