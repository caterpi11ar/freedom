import type { ConfigLayer, ConfigPath, FreedomConfig, PartialConfig } from './schema.js'
// 配置加载和管理系统
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import process from 'node:process'
import { ConfigurationError } from '../utils/errors.js'
import { CONFIG_PATHS, DEFAULT_CONFIG, ENV_MAPPING } from './defaults.js'
import { validateConfig } from './validation.js'

export class ConfigManager {
  private layers: ConfigLayer[] = []
  private mergedConfig: FreedomConfig = { ...DEFAULT_CONFIG }

  constructor(private cwd: string = process.cwd()) {
    this.loadConfiguration()
  }

  /**
   * 获取完整的合并后配置
   */
  getConfig(): FreedomConfig {
    return { ...this.mergedConfig }
  }

  /**
   * 根据路径获取配置值
   */
  get<T = unknown>(path: ConfigPath): T | undefined {
    const keys = path.split('.')
    let value: any = this.mergedConfig

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      }
      else {
        return undefined
      }
    }

    return value as T
  }

  /**
   * 设置配置值
   */
  set(path: ConfigPath, value: unknown): void {
    const keys = path.split('.')
    let target: any = this.mergedConfig

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {}
      }
      target = target[key]
    }

    const lastKey = keys[keys.length - 1]
    target[lastKey] = value
  }

  /**
   * 获取所有配置层信息
   */
  getLayers(): ConfigLayer[] {
    return [...this.layers]
  }

  /**
   * 重新加载配置
   */
  reload(): void {
    this.layers = []
    this.mergedConfig = { ...DEFAULT_CONFIG }
    this.loadConfiguration()
  }

  private loadConfiguration(): void {
    // 1. 加载默认配置
    this.addLayer('default', DEFAULT_CONFIG)

    // 2. 加载系统配置
    this.loadSystemConfig()

    // 3. 加载用户全局配置
    this.loadUserConfig()

    // 4. 加载工作区配置
    this.loadWorkspaceConfig()

    // 5. 加载环境变量
    this.loadEnvironmentConfig()

    // 6. 合并所有配置层
    this.mergeConfigurations()

    // 7. 验证最终配置
    this.validateFinalConfig()
  }

  private loadSystemConfig(): void {
    for (const configPath of CONFIG_PATHS.system) {
      const fullPath = this.expandPath(configPath)
      if (existsSync(fullPath)) {
        try {
          const config = this.loadJsonFile(fullPath)
          this.addLayer('system', config, fullPath)
          break // 只使用第一个找到的系统配置
        }
        catch (error) {
          console.warn(`Failed to load system config from ${fullPath}:`, error)
        }
      }
    }
  }

  private loadUserConfig(): void {
    for (const configPath of CONFIG_PATHS.global) {
      const fullPath = this.expandPath(configPath)
      if (existsSync(fullPath)) {
        try {
          const config = this.loadJsonFile(fullPath)
          this.addLayer('user', config, fullPath)
          break // 只使用第一个找到的用户配置
        }
        catch (error) {
          console.warn(`Failed to load user config from ${fullPath}:`, error)
        }
      }
    }
  }

  private loadWorkspaceConfig(): void {
    for (const configPath of CONFIG_PATHS.local) {
      const fullPath = resolve(this.cwd, configPath)
      if (existsSync(fullPath)) {
        try {
          const config = this.loadJsonFile(fullPath)
          this.addLayer('workspace', config, fullPath)
          break // 只使用第一个找到的工作区配置
        }
        catch (error) {
          console.warn(`Failed to load workspace config from ${fullPath}:`, error)
        }
      }
    }
  }

  private loadEnvironmentConfig(): void {
    const envConfig: PartialConfig = {}

    for (const [envVar, configPath] of Object.entries(ENV_MAPPING)) {
      const value = process.env[envVar]
      if (value !== undefined) {
        this.setNestedValue(envConfig, configPath, this.parseEnvValue(value))
      }
    }

    if (Object.keys(envConfig).length > 0) {
      this.addLayer('env', envConfig)
    }
  }

  private mergeConfigurations(): void {
    this.mergedConfig = { ...DEFAULT_CONFIG }

    for (const layer of this.layers) {
      this.mergedConfig = this.deepMerge(this.mergedConfig, layer.config as Partial<FreedomConfig>)
    }
  }

  private validateFinalConfig(): void {
    const errors = validateConfig(this.mergedConfig)
    if (errors.length > 0) {
      const errorMessages = errors.map(err => `${err.path}: ${err.message}`).join(', ')
      throw new ConfigurationError(`Configuration validation failed: ${errorMessages}`)
    }
  }

  private addLayer(source: ConfigLayer['source'], config: PartialConfig, filePath?: string): void {
    this.layers.push({ source, config, filePath })
  }

  private loadJsonFile(filePath: string): PartialConfig {
    try {
      const content = readFileSync(filePath, 'utf-8')
      return JSON.parse(content) as PartialConfig
    }
    catch (error) {
      throw new ConfigurationError(`Failed to parse JSON config file ${filePath}: ${error}`)
    }
  }

  private expandPath(path: string): string {
    return path
      .replace(/^~/, homedir())
      .replace(/%([^%]+)%/g, (_, envVar) => process.env[envVar] || '')
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    let current = obj

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {}
      }
      current = current[key]
    }

    current[keys[keys.length - 1]] = value
  }

  private parseEnvValue(value: string): unknown {
    // 尝试解析为布尔值
    if (value.toLowerCase() === 'true')
      return true
    if (value.toLowerCase() === 'false')
      return false

    // 尝试解析为数字
    const num = Number(value)
    if (!Number.isNaN(num) && Number.isFinite(num))
      return num

    // 返回字符串
    return value
  }

  private deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
    const result = { ...target }

    for (const key in source) {
      const sourceValue = source[key]
      const targetValue = result[key]

      if (this.isObject(sourceValue) && this.isObject(targetValue)) {
        result[key] = this.deepMerge(targetValue, sourceValue as any)
      }
      else if (sourceValue !== undefined) {
        result[key] = sourceValue as any
      }
    }

    return result
  }

  private isObject(value: unknown): value is Record<string, any> {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }
}

// 导出单例实例
export const configManager = new ConfigManager()

// 便捷函数
export function getConfig(): FreedomConfig {
  return configManager.getConfig()
}

export function getConfigValue<T = unknown>(path: ConfigPath): T | undefined {
  return configManager.get<T>(path)
}

export function setConfigValue(path: ConfigPath, value: unknown): void {
  configManager.set(path, value)
}

export function reloadConfig(): void {
  configManager.reload()
}

export function getAllConfigValues(): Record<string, unknown> {
  return configManager.getConfig() as unknown as Record<string, unknown>
}
