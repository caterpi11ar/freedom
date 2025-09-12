// 数据存储层 - 提供统一的数据持久化接口
import fs from 'node:fs/promises'
import path from 'node:path'
// import { globalStateManager } from '@freedom/shared'

export interface DataStore {
  // 配置存储
  configs: {
    accountConfigs: AccountConfig[]
    accountGroups: AccountGroup[]
    scriptConfigs: ScriptConfig[]
    scriptTemplates: ScriptTemplate[]
    promptTemplates: PromptTemplate[]
    apiMethods: APIMethod[]
    systemSettings: SystemSettings
  }

  // 运行时数据
  runtime: {
    tasks: GameTask[]
    logs: LogEntry[]
    sessions: LoginSession[]
    activePrompts: string[]
    builderState: ScriptBuilderState
  }

  // 缓存数据
  cache: {
    scriptRegistry: GameScript[]
    promptLibrary: PromptTemplate[]
    apiDocumentation: APIMethod[]
    userPreferences: UserPreferences
    searchIndex: SearchIndex
  }
}

// 基础类型定义
export interface AccountConfig {
  id: string
  name: string
  nickname: string
  server: 'official' | 'bilibili'
  encryptedCredentials: string
  gameUrl: string
  autoLogin: boolean
  groupId?: string
  priority: number
  status: 'active' | 'disabled' | 'banned' | 'maintenance'
  lastUsed: Date
  createdAt: Date
}

export interface AccountGroup {
  id: string
  name: string
  description: string
  accounts: string[]
  rotationMode: 'none' | 'sequential' | 'random'
  isActive: boolean
}

export interface LoginSession {
  sessionId: string
  accountId: string
  status: 'connecting' | 'authenticating' | 'connected' | 'failed'
  startTime: Date
  lastActivity: Date
}

export interface GameTask {
  id: string
  name: string
  type: 'script' | 'schedule' | 'manual'
  script: string
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  priority: number
  progress: number
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface GameScript {
  id: string
  name: string
  version: string
  description: string
  author: string
  category: string
  tags: string[]
  entrypoint: string
  isEnabled: boolean
  installedAt: Date
  lastUsed?: Date
  sourceType: 'template' | 'custom' | 'community' | 'generated'
}

export interface ScriptTemplate {
  id: string
  name: string
  description: string
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  parameters: TemplateParameter[]
  example: string
  documentation: string
}

export interface PromptTemplate {
  id: string
  name: string
  description: string
  category: 'script_generation' | 'debugging' | 'optimization' | 'documentation'
  template: string
  variables: PromptVariable[]
  examples: PromptExample[]
  usage: string
  version: string
  author: string
  tags: string[]
  rating: number
  usageCount: number
  createdAt: Date
  updatedAt: Date
}

export interface APIMethod {
  id: string
  name: string
  module: string
  description: string
  parameters: APIParameter[]
  returnType: string
  examples: APIExample[]
  relatedPrompts: string[]
  documentation: string
  version: string
}

export interface LogEntry {
  id: string
  timestamp: Date
  level: 'debug' | 'info' | 'warn' | 'error'
  category: 'system' | 'game' | 'script' | 'user'
  message: string
  metadata?: Record<string, any>
  source: string
  sessionId?: string
  taskId?: string
}

// 辅助类型
export interface TemplateParameter {
  name: string
  type: string
  description: string
  required: boolean
  defaultValue?: any
}

export interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  description: string
  required: boolean
  defaultValue?: any
  validation?: string
}

export interface PromptExample {
  title: string
  input: Record<string, any>
  expectedOutput: string
  description: string
}

export interface APIParameter {
  name: string
  type: string
  description: string
  required: boolean
  defaultValue?: any
}

export interface APIExample {
  title: string
  code: string
  description: string
  category: string
}

export interface ScriptConfig {
  [key: string]: any
}

export interface SystemSettings {
  maxSessions: number
  logLevel: string
  autoSave: boolean
  dataDirectory: string
}

export interface ScriptBuilderState {
  currentTemplate?: string
  isActive: boolean
  lastSaved?: Date
}

export interface UserPreferences {
  theme: 'light' | 'dark'
  language: string
  notifications: boolean
}

export interface SearchIndex {
  scripts: Map<string, string[]>
  prompts: Map<string, string[]>
  lastUpdated: Date
}

export class DataStoreManager {
  private dataPath: string
  private store: DataStore
  private autoSaveInterval?: NodeJS.Timeout

  constructor(dataPath: string = './data') {
    this.dataPath = dataPath
    this.store = this.createEmptyStore()
  }

  private createEmptyStore(): DataStore {
    return {
      configs: {
        accountConfigs: [],
        accountGroups: [],
        scriptConfigs: [],
        scriptTemplates: [],
        promptTemplates: [],
        apiMethods: [],
        systemSettings: {
          maxSessions: 5,
          logLevel: 'info',
          autoSave: true,
          dataDirectory: this.dataPath,
        },
      },
      runtime: {
        tasks: [],
        logs: [],
        sessions: [],
        activePrompts: [],
        builderState: {
          isActive: false,
        },
      },
      cache: {
        scriptRegistry: [],
        promptLibrary: [],
        apiDocumentation: [],
        userPreferences: {
          theme: 'dark',
          language: 'zh-CN',
          notifications: true,
        },
        searchIndex: {
          scripts: new Map(),
          prompts: new Map(),
          lastUpdated: new Date(),
        },
      },
    }
  }

  async initialize(): Promise<void> {
    await this.ensureDataDirectory()
    await this.loadData()
    this.startAutoSave()
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.access(this.dataPath)
    }
    catch {
      await fs.mkdir(this.dataPath, { recursive: true })
    }
  }

  private async loadData(): Promise<void> {
    try {
      const dataFile = path.join(this.dataPath, 'store.json')
      const data = await fs.readFile(dataFile, 'utf-8')
      const parsed = JSON.parse(data, (_key, value) => {
        // 恢复 Date 对象
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          return new Date(value)
        }
        // 恢复 Map 对象
        if (value && typeof value === 'object' && value.__type === 'Map') {
          return new Map(value.data)
        }
        return value
      })

      this.store = { ...this.createEmptyStore(), ...parsed }
    }
    catch (error) {
      console.warn('Failed to load data store, using defaults:', error)
      this.store = this.createEmptyStore()
    }
  }

  async saveData(): Promise<void> {
    try {
      const dataFile = path.join(this.dataPath, 'store.json')
      const data = JSON.stringify(this.store, (_key, value) => {
        // 序列化 Map 对象
        if (value instanceof Map) {
          return {
            __type: 'Map',
            data: Array.from(value.entries()),
          }
        }
        return value
      }, 2)

      await fs.writeFile(dataFile, data, 'utf-8')
    }
    catch (error) {
      console.error('Failed to save data store:', error)
    }
  }

  private startAutoSave(): void {
    if (this.store.configs.systemSettings.autoSave) {
      this.autoSaveInterval = setInterval(() => {
        this.saveData()
      }, 30000) // 每30秒自动保存
    }
  }

  stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval)
      this.autoSaveInterval = undefined
    }
  }

  // 数据访问方法
  getStore(): DataStore {
    return this.store
  }

  updateStore(updates: Partial<DataStore>): void {
    this.store = { ...this.store, ...updates }
  }

  // 配置数据操作
  getAccountConfigs(): AccountConfig[] {
    return this.store.configs.accountConfigs
  }

  addAccountConfig(config: AccountConfig): void {
    this.store.configs.accountConfigs.push(config)
    // 暂时注释掉，等待StateManager实现相应方法
    // globalStateManager.updateAccountsState({
    //   totalAccounts: this.store.configs.accountConfigs.length,
    // })
  }

  updateAccountConfig(id: string, updates: Partial<AccountConfig>): void {
    const index = this.store.configs.accountConfigs.findIndex(c => c.id === id)
    if (index !== -1) {
      this.store.configs.accountConfigs[index] = {
        ...this.store.configs.accountConfigs[index],
        ...updates,
      }
    }
  }

  removeAccountConfig(id: string): void {
    this.store.configs.accountConfigs = this.store.configs.accountConfigs.filter(c => c.id !== id)
    // 暂时注释掉，等待StateManager实现相应方法
    // globalStateManager.updateAccountsState({
    //   totalAccounts: this.store.configs.accountConfigs.length,
    // })
  }

  // 脚本模板操作
  getScriptTemplates(): ScriptTemplate[] {
    return this.store.configs.scriptTemplates
  }

  addScriptTemplate(template: ScriptTemplate): void {
    this.store.configs.scriptTemplates.push(template)
  }

  // 提示词模板操作
  getPromptTemplates(): PromptTemplate[] {
    return this.store.configs.promptTemplates
  }

  addPromptTemplate(template: PromptTemplate): void {
    this.store.configs.promptTemplates.push(template)
    // 暂时注释掉，等待StateManager实现相应方法
    // globalStateManager.updatePromptLibraryState({
    //   totalPrompts: this.store.configs.promptTemplates.length,
    // })
  }

  // 任务操作
  getTasks(): GameTask[] {
    return this.store.runtime.tasks
  }

  addTask(task: GameTask): void {
    this.store.runtime.tasks.push(task)
    // 暂时注释掉，等待StateManager实现相应方法
    // globalStateManager.updateTasksState({
    //   queueSize: this.store.runtime.tasks.length,
    //   lastTaskUpdate: new Date(),
    // })
  }

  // 日志操作
  addLogEntry(entry: LogEntry): void {
    this.store.runtime.logs.push(entry)

    // 限制日志条数，防止内存溢出
    const maxLogs = 10000
    if (this.store.runtime.logs.length > maxLogs) {
      this.store.runtime.logs = this.store.runtime.logs.slice(-maxLogs)
    }
  }

  getLogEntries(filter?: {
    level?: string
    category?: string
    startTime?: Date
    endTime?: Date
    limit?: number
  }): LogEntry[] {
    let logs = this.store.runtime.logs

    if (filter) {
      if (filter.level) {
        logs = logs.filter(log => log.level === filter.level)
      }
      if (filter.category) {
        logs = logs.filter(log => log.category === filter.category)
      }
      if (filter.startTime) {
        logs = logs.filter(log => log.timestamp >= filter.startTime!)
      }
      if (filter.endTime) {
        logs = logs.filter(log => log.timestamp <= filter.endTime!)
      }
      if (filter.limit) {
        logs = logs.slice(-filter.limit)
      }
    }

    return logs
  }

  // 清理和维护
  async cleanup(): Promise<void> {
    this.stopAutoSave()
    await this.saveData()
  }
}

// 导出全局数据存储实例
export const dataStore = new DataStoreManager()
