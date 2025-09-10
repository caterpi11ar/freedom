import type { FreedomConfig } from '@freedom/shared'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
// 扩展加载器 - 负责动态加载和管理扩展
import { pathToFileURL } from 'node:url'
import chalk from 'chalk'
import { GameAutomationError } from '../utils/errors.js'

export interface ExtensionManifest {
  name: string
  version: string
  description?: string
  main: string
  author?: string
  license?: string
  keywords?: string[]
  dependencies?: Record<string, string>
  freedomVersion?: string
  permissions?: string[]
  scripts?: Record<string, string>
}

export interface LoadedExtension {
  manifest: ExtensionManifest
  module: any
  path: string
  loaded: boolean
  enabled: boolean
  error?: Error
}

export interface ExtensionContext {
  config: FreedomConfig
  logger: {
    info: (message: string) => void
    warn: (message: string) => void
    error: (message: string) => void
  }
  api: {
    registerCommand?: (name: string, handler: (...args: any[]) => void) => void
    registerHook?: (event: string, handler: (...args: any[]) => void) => void
  }
}

export class ExtensionLoader {
  private extensions = new Map<string, LoadedExtension>()
  private extensionPaths: string[] = []

  constructor(private context: ExtensionContext) {
    // 默认扩展目录
    this.extensionPaths = [
      path.join(process.cwd(), 'extensions'),
      path.join(process.cwd(), 'node_modules'),
      path.join(require.resolve('@freedom/cli'), '../extensions'),
    ]
  }

  /**
   * 添加扩展搜索路径
   */
  addExtensionPath(extensionPath: string): void {
    if (!this.extensionPaths.includes(extensionPath)) {
      this.extensionPaths.push(extensionPath)
    }
  }

  /**
   * 发现并加载所有扩展
   */
  async discoverAndLoadExtensions(): Promise<void> {
    this.context.logger.info('🔍 Discovering extensions...')

    for (const searchPath of this.extensionPaths) {
      try {
        await this.loadExtensionsFromPath(searchPath)
      }
      catch (error) {
        this.context.logger.warn(`Failed to load extensions from ${searchPath}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    this.context.logger.info(`📦 Discovered ${this.extensions.size} extension(s)`)
  }

  /**
   * 从指定路径加载扩展
   */
  private async loadExtensionsFromPath(searchPath: string): Promise<void> {
    try {
      const stats = await stat(searchPath)
      if (!stats.isDirectory()) {
        // 不是目录，跳过

      }
    }
    catch {
      // 路径不存在，跳过

    }

    // TODO: 实现目录扫描逻辑
    // const entries = await readdir(searchPath, { withFileTypes: true })
    // for (const entry of entries) {
    //   if (entry.isDirectory()) {
    //     const manifestPath = path.join(searchPath, entry.name, 'package.json')
    //     await this.loadExtensionFromManifest(manifestPath)
    //   }
    // }
  }

  /**
   * 从 manifest 文件加载扩展
   */
  async loadExtensionFromManifest(manifestPath: string): Promise<LoadedExtension> {
    try {
      const manifestContent = await readFile(manifestPath, 'utf-8')
      const manifest: ExtensionManifest = JSON.parse(manifestContent)

      if (!manifest.name) {
        throw new GameAutomationError('Extension manifest missing required "name" field')
      }

      if (!manifest.main) {
        throw new GameAutomationError('Extension manifest missing required "main" field')
      }

      const extensionDir = path.dirname(manifestPath)
      const mainFile = path.resolve(extensionDir, manifest.main)

      return await this.loadExtensionFromFile(mainFile, manifest)
    }
    catch (error) {
      const loadError = error instanceof Error ? error : new Error('Unknown error')
      const failedExtension: LoadedExtension = {
        manifest: { name: 'unknown', version: '0.0.0', main: '' },
        module: null,
        path: manifestPath,
        loaded: false,
        enabled: false,
        error: loadError,
      }

      this.context.logger.error(`Failed to load extension from ${manifestPath}: ${loadError.message}`)
      return failedExtension
    }
  }

  /**
   * 从文件加载扩展
   */
  async loadExtensionFromFile(filePath: string, manifest?: ExtensionManifest): Promise<LoadedExtension> {
    try {
      const fileUrl = pathToFileURL(filePath).href
      const module = await import(fileUrl)

      if (!manifest) {
        // 尝试从同目录查找 package.json
        const packagePath = path.join(path.dirname(filePath), 'package.json')
        try {
          const packageContent = await readFile(packagePath, 'utf-8')
          manifest = JSON.parse(packageContent)
        }
        catch {
          // 使用默认 manifest
          manifest = {
            name: path.basename(filePath, path.extname(filePath)),
            version: '1.0.0',
            main: path.basename(filePath),
          }
        }
      }

      const extension: LoadedExtension = {
        manifest,
        module,
        path: filePath,
        loaded: true,
        enabled: false,
        error: undefined,
      }

      this.extensions.set(manifest.name, extension)
      this.context.logger.info(`📦 Loaded extension: ${chalk.cyan(manifest.name)} v${manifest.version}`)

      return extension
    }
    catch (error) {
      const loadError = error instanceof Error ? error : new Error('Unknown error')
      const failedExtension: LoadedExtension = {
        manifest: manifest || { name: 'unknown', version: '0.0.0', main: '' },
        module: null,
        path: filePath,
        loaded: false,
        enabled: false,
        error: loadError,
      }

      this.extensions.set(failedExtension.manifest.name, failedExtension)
      this.context.logger.error(`Failed to load extension ${filePath}: ${loadError.message}`)

      return failedExtension
    }
  }

  /**
   * 启用扩展
   */
  async enableExtension(name: string): Promise<void> {
    const extension = this.extensions.get(name)
    if (!extension) {
      throw new GameAutomationError(`Extension "${name}" not found`)
    }

    if (!extension.loaded) {
      throw new GameAutomationError(`Extension "${name}" failed to load: ${extension.error?.message || 'Unknown error'}`)
    }

    if (extension.enabled) {
      this.context.logger.warn(`Extension "${name}" is already enabled`)
      return
    }

    try {
      // 调用扩展的启用钩子
      if (extension.module.onEnable) {
        await extension.module.onEnable(this.context)
      }

      extension.enabled = true
      this.context.logger.info(`✅ Enabled extension: ${chalk.green(name)}`)
    }
    catch (error) {
      const enableError = error instanceof Error ? error : new Error('Unknown error')
      this.context.logger.error(`Failed to enable extension "${name}": ${enableError.message}`)
      throw new GameAutomationError(`Failed to enable extension "${name}": ${enableError.message}`)
    }
  }

  /**
   * 禁用扩展
   */
  async disableExtension(name: string): Promise<void> {
    const extension = this.extensions.get(name)
    if (!extension) {
      throw new GameAutomationError(`Extension "${name}" not found`)
    }

    if (!extension.enabled) {
      this.context.logger.warn(`Extension "${name}" is already disabled`)
      return
    }

    try {
      // 调用扩展的禁用钩子
      if (extension.module.onDisable) {
        await extension.module.onDisable(this.context)
      }

      extension.enabled = false
      this.context.logger.info(`❌ Disabled extension: ${chalk.yellow(name)}`)
    }
    catch (error) {
      const disableError = error instanceof Error ? error : new Error('Unknown error')
      this.context.logger.error(`Failed to disable extension "${name}": ${disableError.message}`)
      throw new GameAutomationError(`Failed to disable extension "${name}": ${disableError.message}`)
    }
  }

  /**
   * 卸载扩展
   */
  async unloadExtension(name: string): Promise<void> {
    const extension = this.extensions.get(name)
    if (!extension) {
      throw new GameAutomationError(`Extension "${name}" not found`)
    }

    if (extension.enabled) {
      await this.disableExtension(name)
    }

    try {
      // 调用扩展的卸载钩子
      if (extension.module.onUnload) {
        await extension.module.onUnload(this.context)
      }

      this.extensions.delete(name)
      this.context.logger.info(`📤 Unloaded extension: ${chalk.red(name)}`)
    }
    catch (error) {
      const unloadError = error instanceof Error ? error : new Error('Unknown error')
      this.context.logger.error(`Failed to unload extension "${name}": ${unloadError.message}`)
      throw new GameAutomationError(`Failed to unload extension "${name}": ${unloadError.message}`)
    }
  }

  /**
   * 获取所有扩展
   */
  getAllExtensions(): LoadedExtension[] {
    return Array.from(this.extensions.values())
  }

  /**
   * 获取特定扩展
   */
  getExtension(name: string): LoadedExtension | undefined {
    return this.extensions.get(name)
  }

  /**
   * 获取已启用的扩展
   */
  getEnabledExtensions(): LoadedExtension[] {
    return this.getAllExtensions().filter(ext => ext.enabled)
  }

  /**
   * 检查扩展是否存在
   */
  hasExtension(name: string): boolean {
    return this.extensions.has(name)
  }

  /**
   * 检查扩展是否已启用
   */
  isExtensionEnabled(name: string): boolean {
    const extension = this.extensions.get(name)
    return extension ? extension.enabled : false
  }

  /**
   * 获取扩展统计信息
   */
  getExtensionStats() {
    const all = this.getAllExtensions()
    return {
      total: all.length,
      loaded: all.filter(ext => ext.loaded).length,
      enabled: all.filter(ext => ext.enabled).length,
      failed: all.filter(ext => ext.error).length,
    }
  }
}
