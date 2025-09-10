import type { ExtensionContext, ExtensionManifest, LoadedExtension } from './ExtensionLoader.js'
// 扩展管理器 - 提供扩展的高级管理功能
import { mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import { GameAutomationError } from '../utils/errors.js'
import { ExtensionLoader } from './ExtensionLoader.js'

export interface ExtensionInstallOptions {
  source: 'registry' | 'git' | 'local' | 'url'
  version?: string
  force?: boolean
  global?: boolean
}

export interface ExtensionBackup {
  name: string
  version: string
  timestamp: Date
  manifest: ExtensionManifest
  files: Array<{ path: string, content: string }>
}

export class ExtensionManager {
  private loader: ExtensionLoader
  private extensionsDir: string
  private backupDir: string

  constructor(context: ExtensionContext) {
    this.loader = new ExtensionLoader(context)
    this.extensionsDir = path.join(process.cwd(), 'extensions')
    this.backupDir = path.join(process.cwd(), '.freedom', 'extension-backups')
  }

  /**
   * 初始化扩展管理器
   */
  async initialize(): Promise<void> {
    // 确保扩展目录存在
    await this.ensureDirectories()

    // 发现并加载所有扩展
    await this.loader.discoverAndLoadExtensions()
  }

  /**
   * 确保必要目录存在
   */
  private async ensureDirectories(): Promise<void> {
    await mkdir(this.extensionsDir, { recursive: true })
    await mkdir(this.backupDir, { recursive: true })
  }

  /**
   * 安装扩展
   */
  async installExtension(name: string, options: ExtensionInstallOptions = { source: 'registry' }): Promise<LoadedExtension> {
    console.log(chalk.blue(`📦 Installing extension: ${chalk.cyan(name)}`))
    console.log(chalk.gray(`Source: ${options.source}`))

    if (options.version) {
      console.log(chalk.gray(`Version: ${options.version}`))
    }

    try {
      // 检查是否已安装
      if (this.loader.hasExtension(name) && !options.force) {
        throw new GameAutomationError(`Extension "${name}" is already installed. Use --force to reinstall.`)
      }

      let extensionPath: string

      switch (options.source) {
        case 'registry':
          extensionPath = await this.installFromRegistry(name, options.version)
          break
        case 'git':
          extensionPath = await this.installFromGit(name)
          break
        case 'local':
          extensionPath = await this.installFromLocal(name)
          break
        case 'url':
          extensionPath = await this.installFromUrl(name)
          break
        default:
          throw new GameAutomationError(`Unsupported installation source: ${options.source}`)
      }

      // 加载扩展
      const manifestPath = path.join(extensionPath, 'package.json')
      const extension = await this.loader.loadExtensionFromManifest(manifestPath)

      console.log(chalk.green(`✅ Successfully installed extension: ${chalk.cyan(name)}`))
      return extension
    }
    catch (error) {
      const installError = error instanceof Error ? error : new Error('Unknown error')
      console.error(chalk.red(`❌ Failed to install extension "${name}": ${installError.message}`))
      throw installError
    }
  }

  /**
   * 从注册表安装扩展（模拟实现）
   */
  private async installFromRegistry(name: string, version?: string): Promise<string> {
    // TODO: 实现真实的注册表安装逻辑
    console.log(chalk.yellow('⚠️  Registry installation not yet implemented'))

    // 创建模拟扩展目录
    const extensionDir = path.join(this.extensionsDir, name)
    await mkdir(extensionDir, { recursive: true })

    // 创建模拟的 package.json
    const manifest: ExtensionManifest = {
      name,
      version: version || '1.0.0',
      description: `Extension ${name} installed from registry`,
      main: 'index.js',
      author: 'Extension Author',
      license: 'MIT',
    }

    await writeFile(
      path.join(extensionDir, 'package.json'),
      JSON.stringify(manifest, null, 2),
    )

    // 创建模拟的主文件
    const mainContent = `
// Extension: ${name}
export function onEnable(context) {
  context.logger.info('Extension ${name} enabled');
}

export function onDisable(context) {
  context.logger.info('Extension ${name} disabled');
}
`
    await writeFile(path.join(extensionDir, 'index.js'), mainContent)

    return extensionDir
  }

  /**
   * 从 Git 安装扩展（模拟实现）
   */
  private async installFromGit(_gitUrl: string): Promise<string> {
    // TODO: 实现 Git 克隆逻辑
    console.log(chalk.yellow('⚠️  Git installation not yet implemented'))
    throw new GameAutomationError('Git installation not yet implemented')
  }

  /**
   * 从本地路径安装扩展
   */
  private async installFromLocal(localPath: string): Promise<string> {
    const sourcePath = path.resolve(localPath)

    try {
      const stats = await stat(sourcePath)
      if (!stats.isDirectory()) {
        throw new GameAutomationError('Local path must be a directory')
      }

      // 读取 manifest
      const manifestPath = path.join(sourcePath, 'package.json')
      const manifestContent = await readFile(manifestPath, 'utf-8')
      const manifest: ExtensionManifest = JSON.parse(manifestContent)

      if (!manifest.name) {
        throw new GameAutomationError('Extension manifest missing required "name" field')
      }

      // 复制到扩展目录
      const targetPath = path.join(this.extensionsDir, manifest.name)
      await this.copyDirectory(sourcePath, targetPath)

      console.log(chalk.green(`📁 Copied extension from ${sourcePath} to ${targetPath}`))
      return targetPath
    }
    catch (error) {
      const copyError = error instanceof Error ? error : new Error('Unknown error')
      throw new GameAutomationError(`Failed to install from local path: ${copyError.message}`)
    }
  }

  /**
   * 从 URL 安装扩展（模拟实现）
   */
  private async installFromUrl(_url: string): Promise<string> {
    // TODO: 实现 URL 下载逻辑
    console.log(chalk.yellow('⚠️  URL installation not yet implemented'))
    throw new GameAutomationError('URL installation not yet implemented')
  }

  /**
   * 复制目录（简单实现）
   */
  private async copyDirectory(source: string, target: string): Promise<void> {
    await mkdir(target, { recursive: true })

    const entries = await readdir(source, { withFileTypes: true })

    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name)
      const targetPath = path.join(target, entry.name)

      if (entry.isDirectory()) {
        await this.copyDirectory(sourcePath, targetPath)
      }
      else {
        const content = await readFile(sourcePath, 'utf-8')
        await writeFile(targetPath, content)
      }
    }
  }

  /**
   * 卸载扩展
   */
  async uninstallExtension(name: string, _options: { keepData?: boolean } = {}): Promise<void> {
    console.log(chalk.red(`📤 Uninstalling extension: ${chalk.cyan(name)}`))

    const extension = this.loader.getExtension(name)
    if (!extension) {
      throw new GameAutomationError(`Extension "${name}" not found`)
    }

    try {
      // 禁用并卸载
      if (extension.enabled) {
        await this.loader.disableExtension(name)
      }
      await this.loader.unloadExtension(name)

      // 删除扩展文件
      const extensionDir = path.join(this.extensionsDir, name)
      try {
        await rm(extensionDir, { recursive: true, force: true })
        console.log(chalk.green(`🗑️  Removed extension directory: ${extensionDir}`))
      }
      catch (error) {
        console.log(chalk.yellow(`⚠️  Could not remove directory ${extensionDir}: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }

      console.log(chalk.green(`✅ Successfully uninstalled extension: ${chalk.cyan(name)}`))
    }
    catch (error) {
      const uninstallError = error instanceof Error ? error : new Error('Unknown error')
      console.error(chalk.red(`❌ Failed to uninstall extension "${name}": ${uninstallError.message}`))
      throw uninstallError
    }
  }

  /**
   * 启用扩展
   */
  async enableExtension(name: string): Promise<void> {
    await this.loader.enableExtension(name)
  }

  /**
   * 禁用扩展
   */
  async disableExtension(name: string): Promise<void> {
    await this.loader.disableExtension(name)
  }

  /**
   * 列出所有扩展
   */
  listExtensions(): LoadedExtension[] {
    return this.loader.getAllExtensions()
  }

  /**
   * 查找扩展
   */
  findExtension(name: string): LoadedExtension | undefined {
    return this.loader.getExtension(name)
  }

  /**
   * 创建扩展备份
   */
  async backup(name: string): Promise<ExtensionBackup> {
    const extension = this.loader.getExtension(name)
    if (!extension) {
      throw new GameAutomationError(`Extension "${name}" not found`)
    }

    try {
      const timestamp = new Date()
      const backupName = `${name}_${timestamp.toISOString().replace(/[:.]/g, '-')}`
      const backupPath = path.join(this.backupDir, `${backupName}.json`)

      // 读取扩展文件
      const extensionDir = path.dirname(extension.path)
      const files: Array<{ path: string, content: string }> = []

      const entries = await readdir(extensionDir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(extensionDir, entry.name)
          const content = await readFile(filePath, 'utf-8')
          files.push({
            path: entry.name,
            content,
          })
        }
      }

      const backup: ExtensionBackup = {
        name: extension.manifest.name,
        version: extension.manifest.version,
        timestamp,
        manifest: extension.manifest,
        files,
      }

      await writeFile(backupPath, JSON.stringify(backup, null, 2))
      console.log(chalk.green(`💾 Created backup: ${backupPath}`))

      return backup
    }
    catch (error) {
      const backupError = error instanceof Error ? error : new Error('Unknown error')
      throw new GameAutomationError(`Failed to create backup for extension "${name}": ${backupError.message}`)
    }
  }

  /**
   * 获取扩展统计信息
   */
  getStats() {
    return this.loader.getExtensionStats()
  }

  /**
   * 获取扩展加载器实例
   */
  getLoader(): ExtensionLoader {
    return this.loader
  }
}
