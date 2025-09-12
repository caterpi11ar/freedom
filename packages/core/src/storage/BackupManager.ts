import { Buffer } from 'node:buffer'
import { createReadStream, createWriteStream } from 'node:fs'
// 备份管理器 - 数据备份和恢复功能
import fs from 'node:fs/promises'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import { createGunzip, createGzip } from 'node:zlib'

export interface BackupConfig {
  backupDir: string
  maxBackups: number
  compressionEnabled: boolean
  autoBackupInterval: number // 小时
}

export interface BackupInfo {
  filename: string
  timestamp: Date
  size: number
  compressed: boolean
  version: string
}

export class BackupManager {
  private config: BackupConfig
  private autoBackupTimer?: NodeJS.Timeout

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      backupDir: './backups',
      maxBackups: 10,
      compressionEnabled: true,
      autoBackupInterval: 24, // 24小时
      ...config,
    }
  }

  async initialize(): Promise<void> {
    await this.ensureBackupDirectory()
    this.startAutoBackup()
  }

  private async ensureBackupDirectory(): Promise<void> {
    try {
      await fs.access(this.config.backupDir)
    }
    catch {
      await fs.mkdir(this.config.backupDir, { recursive: true })
    }
  }

  async createBackup(dataPath: string, description?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `backup-${timestamp}`
    const backupPath = path.join(this.config.backupDir, backupName)

    try {
      // 读取原始数据
      const data = await fs.readFile(dataPath, 'utf-8')

      // 创建备份元数据
      const metadata = {
        timestamp: new Date(),
        description: description || 'Auto backup',
        version: '1.0.0',
        originalPath: dataPath,
        compressed: this.config.compressionEnabled,
      }

      // 保存数据
      if (this.config.compressionEnabled) {
        // 压缩备份
        const backupFile = `${backupPath}.json.gz`
        await this.compressData(data, backupFile)

        // 保存元数据
        await fs.writeFile(`${backupPath}.meta.json`, JSON.stringify(metadata, null, 2))

        return backupFile
      }
      else {
        // 直接备份
        const backupFile = `${backupPath}.json`
        await fs.writeFile(backupFile, data)

        // 保存元数据
        await fs.writeFile(`${backupPath}.meta.json`, JSON.stringify(metadata, null, 2))

        return backupFile
      }
    }
    catch (error) {
      throw new Error(`Failed to create backup: ${error}`)
    }
    finally {
      // 清理旧备份
      await this.cleanupOldBackups()
    }
  }

  async restoreBackup(backupPath: string, targetPath: string): Promise<void> {
    try {
      // 检查备份文件是否存在
      await fs.access(backupPath)

      // 判断是否为压缩文件
      const isCompressed = backupPath.endsWith('.gz')

      if (isCompressed) {
        // 解压并恢复
        await this.decompressData(backupPath, targetPath)
      }
      else {
        // 直接复制
        await fs.copyFile(backupPath, targetPath)
      }
    }
    catch (error) {
      throw new Error(`Failed to restore backup: ${error}`)
    }
  }

  async listBackups(): Promise<BackupInfo[]> {
    try {
      const files = await fs.readdir(this.config.backupDir)
      const backups: BackupInfo[] = []

      for (const file of files) {
        if (file.endsWith('.meta.json')) {
          const metaPath = path.join(this.config.backupDir, file)
          const metaData = JSON.parse(await fs.readFile(metaPath, 'utf-8'))

          const backupFile = file.replace('.meta.json', metaData.compressed ? '.json.gz' : '.json')
          const backupPath = path.join(this.config.backupDir, backupFile)

          try {
            const stats = await fs.stat(backupPath)
            backups.push({
              filename: backupFile,
              timestamp: new Date(metaData.timestamp),
              size: stats.size,
              compressed: metaData.compressed,
              version: metaData.version,
            })
          }
          catch {
            // 备份文件可能已被删除，跳过
            continue
          }
        }
      }

      // 按时间戳排序（最新的在前）
      return backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }
    catch (error) {
      throw new Error(`Failed to list backups: ${error}`)
    }
  }

  async deleteBackup(filename: string): Promise<void> {
    try {
      const backupPath = path.join(this.config.backupDir, filename)
      const metaPath = path.join(this.config.backupDir, filename.replace(/\.json(\.gz)?$/, '.meta.json'))

      await fs.unlink(backupPath)

      try {
        await fs.unlink(metaPath)
      }
      catch {
        // 元数据文件可能不存在，忽略错误
      }
    }
    catch (error) {
      throw new Error(`Failed to delete backup: ${error}`)
    }
  }

  private async compressData(data: string, outputPath: string): Promise<void> {
    const readStream = createReadStream(Buffer.from(data))
    const writeStream = createWriteStream(outputPath)
    const gzipStream = createGzip()

    await pipeline(readStream, gzipStream, writeStream)
  }

  private async decompressData(inputPath: string, outputPath: string): Promise<void> {
    const readStream = createReadStream(inputPath)
    const writeStream = createWriteStream(outputPath)
    const gunzipStream = createGunzip()

    await pipeline(readStream, gunzipStream, writeStream)
  }

  private async cleanupOldBackups(): Promise<void> {
    try {
      const backups = await this.listBackups()

      if (backups.length > this.config.maxBackups) {
        const backupsToDelete = backups.slice(this.config.maxBackups)

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.filename)
        }
      }
    }
    catch (error) {
      console.warn('Failed to cleanup old backups:', error)
    }
  }

  private startAutoBackup(): void {
    if (this.config.autoBackupInterval > 0) {
      const intervalMs = this.config.autoBackupInterval * 60 * 60 * 1000

      this.autoBackupTimer = setInterval(async () => {
        try {
          const dataPath = './data/store.json'
          await this.createBackup(dataPath, 'Automatic backup')
        }
        catch (error) {
          console.error('Auto backup failed:', error)
        }
      }, intervalMs)
    }
  }

  stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer)
      this.autoBackupTimer = undefined
    }
  }

  // 验证备份完整性
  async verifyBackup(backupPath: string): Promise<boolean> {
    try {
      const isCompressed = backupPath.endsWith('.gz')

      if (isCompressed) {
        // 尝试解压到临时文件
        const tempPath = `${backupPath}.temp`
        await this.decompressData(backupPath, tempPath)

        // 验证JSON格式
        const data = await fs.readFile(tempPath, 'utf-8')
        JSON.parse(data)

        // 删除临时文件
        await fs.unlink(tempPath)
      }
      else {
        // 直接验证JSON格式
        const data = await fs.readFile(backupPath, 'utf-8')
        JSON.parse(data)
      }

      return true
    }
    catch {
      return false
    }
  }

  // 获取备份统计信息
  async getBackupStats(): Promise<{
    totalBackups: number
    totalSize: number
    oldestBackup?: Date
    newestBackup?: Date
  }> {
    try {
      const backups = await this.listBackups()

      const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0)
      const timestamps = backups.map(b => b.timestamp)

      return {
        totalBackups: backups.length,
        totalSize,
        oldestBackup: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : undefined,
        newestBackup: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : undefined,
      }
    }
    catch {
      return {
        totalBackups: 0,
        totalSize: 0,
      }
    }
  }

  async cleanup(): Promise<void> {
    this.stopAutoBackup()
  }
}

// 导出备份管理器实例
export const backupManager = new BackupManager()
