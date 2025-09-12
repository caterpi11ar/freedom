// Shared utilities and types for Freedom project

// State management types and utilities
export interface GlobalState {
  isRunning: boolean
  sessionId?: string
  lastActivity?: Date
  startTime: Date

  // 多账户管理状态
  accounts: {
    currentAccount?: string
    activeSessionCount: number
    totalAccounts: number
  }

  // 任务队列执行状态
  tasks: {
    queueSize: number
    runningTasks: number
    lastTaskUpdate?: Date
  }

  // 脚本构造器工作状态
  scriptBuilder: {
    isActive: boolean
    currentTemplate?: string
    lastSaved?: Date
  }

  // 提示词库活跃状态
  promptLibrary: {
    totalPrompts: number
    activePrompts: string[]
    lastUsed?: Date
  }

  // 浏览器会话池状态
  browser: {
    activeSessions: number
    maxSessions: number
    totalMemoryUsage: number
  }

  // 日志状态
  logging: {
    isActive: boolean
    recentErrors: number
    logLevel: string
  }
}

export class StateManager {
  private state: GlobalState = {
    isRunning: false,
    startTime: new Date(),
    accounts: {
      activeSessionCount: 0,
      totalAccounts: 0,
    },
    tasks: {
      queueSize: 0,
      runningTasks: 0,
    },
    scriptBuilder: {
      isActive: false,
    },
    promptLibrary: {
      totalPrompts: 0,
      activePrompts: [],
    },
    browser: {
      activeSessions: 0,
      maxSessions: 5,
      totalMemoryUsage: 0,
    },
    logging: {
      isActive: false,
      recentErrors: 0,
      logLevel: 'INFO',
    },
  }

  private listeners: Array<() => void> = []

  getState(): GlobalState {
    return { ...this.state }
  }

  setState(updates: Partial<GlobalState>): void {
    this.state = { ...this.state, ...updates }
    this.notifyListeners()
  }

  onStateChange(callback: () => void): void {
    this.listeners.push(callback)
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener()
    }
  }

  // 账户状态更新方法
  updateAccountsState(updates: Partial<GlobalState['accounts']>): void {
    this.setState({ accounts: { ...this.state.accounts, ...updates } })
  }

  // 任务状态更新方法
  updateTasksState(updates: Partial<GlobalState['tasks']>): void {
    this.setState({ tasks: { ...this.state.tasks, ...updates } })
  }

  // 脚本构造器状态更新方法
  updateScriptBuilderState(updates: Partial<GlobalState['scriptBuilder']>): void {
    this.setState({ scriptBuilder: { ...this.state.scriptBuilder, ...updates } })
  }

  // 提示词库状态更新方法
  updatePromptLibraryState(updates: Partial<GlobalState['promptLibrary']>): void {
    this.setState({ promptLibrary: { ...this.state.promptLibrary, ...updates } })
  }

  // 浏览器状态更新方法
  updateBrowserState(updates: Partial<GlobalState['browser']>): void {
    this.setState({ browser: { ...this.state.browser, ...updates } })
  }

  // 日志状态更新方法
  updateLoggingState(updates: Partial<GlobalState['logging']>): void {
    this.setState({ logging: { ...this.state.logging, ...updates } })
  }
}

export const globalStateManager = new StateManager()

// Store utilities for interactive CLI
export interface PromptStore {
  prompt: (options: any) => Promise<any>
}

class DefaultStore implements PromptStore {
  async prompt(options: any): Promise<any> {
    // This is a placeholder implementation
    // In a real CLI app, this would use inquirer or similar
    console.log('Prompt:', options.message)
    if (options.choices) {
      return options.choices[0]?.value
    }
    return ''
  }
}

const store = new DefaultStore()

export function getStore(): PromptStore {
  return store
}

// Configuration module
export * from './config/index.js'

// Configuration types
export * from './types/config.js'
