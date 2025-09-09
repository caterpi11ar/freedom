/**
 * CLI应用状态类型定义
 */

export interface ServiceState {
  status: 'stopped' | 'starting' | 'running' | 'stopping' | 'error'
  uptime?: number
  lastStartTime?: Date
  error?: string
}

export interface TaskState {
  active: number
  completed: number
  failed: number
  lastTask?: string
  lastTaskTime?: Date
}

export interface HealthState {
  browserConnected: boolean
  networkStatus: 'online' | 'offline' | 'unstable'
  lastHealthCheck?: Date
}

export interface ConfigState {
  headless: boolean
  timeout: number
  retryCount: number
}

export interface AppState {
  service: ServiceState
  tasks: TaskState
  health: HealthState
  config: ConfigState
}

export type StateUpdateEvent
  = | { type: 'service:start' }
    | { type: 'service:stop' }
    | { type: 'service:error', error: string }
    | { type: 'task:start', taskName: string }
    | { type: 'task:complete', taskName: string }
    | { type: 'task:fail', taskName: string, error: string }
    | { type: 'health:update', health: Partial<HealthState> }
    | { type: 'config:update', config: Partial<ConfigState> }

export type StateListener = (state: AppState) => void
