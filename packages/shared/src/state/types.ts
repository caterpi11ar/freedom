/**
 * Freedom应用状态类型定义
 * 跨所有包共享的状态结构
 */

export interface AuthState {
  isLoggedIn: boolean
  username?: string
  sessionId?: string
  lastLoginTime?: Date
  sessionExpiry?: Date
}

export interface BrowserState {
  isConnected: boolean
  isHeadless: boolean
  pid?: number
  url?: string
  lastConnectTime?: Date
  connectionError?: string
}

export interface ServiceState {
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error'
  uptime?: number
  lastStartTime?: Date
  error?: string
  pid?: number
}

export interface TaskState {
  active: TaskInfo[]
  completed: TaskInfo[]
  failed: TaskInfo[]
  totalCompleted: number
  totalFailed: number
}

export interface TaskInfo {
  id: string
  name: string
  type: string
  startTime: Date
  endTime?: Date
  status: 'pending' | 'running' | 'completed' | 'failed'
  error?: string
  progress?: number
}

export interface HealthState {
  networkStatus: 'online' | 'offline' | 'unstable'
  lastHealthCheck?: Date
  performance: {
    cpu?: number
    memory?: number
    responseTime?: number
  }
}

export interface ConfigState {
  browser: {
    headless: boolean
    timeout: number
    userAgent?: string
  }
  executor: {
    maxConcurrent: number
    retryCount: number
    retryDelay: number
  }
  general: {
    autoStart: boolean
    logLevel: 'debug' | 'info' | 'warn' | 'error'
  }
}

export interface AppState {
  auth: AuthState
  browser: BrowserState
  service: ServiceState
  tasks: TaskState
  health: HealthState
  config: ConfigState
  meta: {
    version: string
    lastUpdate: Date
  }
}

/**
 * 状态更新事件
 */
export type StateUpdateEvent
  // 认证事件
  = | { type: 'auth:login', username: string, sessionId?: string }
    | { type: 'auth:logout' }
    | { type: 'auth:session-update', sessionId: string, expiry?: Date }

  // 浏览器事件
    | { type: 'browser:connect', pid: number, url?: string }
    | { type: 'browser:disconnect', reason?: string }
    | { type: 'browser:error', error: string }

  // 服务事件
    | { type: 'service:start', pid: number }
    | { type: 'service:stop' }
    | { type: 'service:error', error: string }

  // 任务事件
    | { type: 'task:create', task: TaskInfo }
    | { type: 'task:start', taskId: string }
    | { type: 'task:progress', taskId: string, progress: number }
    | { type: 'task:complete', taskId: string, result?: any }
    | { type: 'task:fail', taskId: string, error: string }

  // 健康事件
    | { type: 'health:update', health: Partial<HealthState> }

  // 配置事件
    | { type: 'config:update', config: Partial<ConfigState> }

export type StateListener = (state: AppState, event?: StateUpdateEvent) => void

/**
 * 状态桥接接口
 * 各模块实现此接口来连接全局状态
 */
export interface StateBridge {
  /**
   * 获取当前状态
   */
  getState: () => AppState

  /**
   * 更新状态
   */
  updateState: (event: StateUpdateEvent) => void

  /**
   * 订阅状态变化
   */
  subscribe: (listener: StateListener) => () => void

  /**
   * 获取特定状态分片
   */
  getSlice: <K extends keyof AppState>(key: K) => AppState[K]
}
