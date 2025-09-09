import type { AppState, StateListener, StateUpdateEvent } from './types'

/**
 * 全局状态存储
 */
class StateStore {
  private state: AppState
  private listeners: Set<StateListener> = new Set()

  constructor() {
    this.state = {
      service: {
        status: 'stopped',
      },
      tasks: {
        active: 0,
        completed: 0,
        failed: 0,
      },
      health: {
        browserConnected: false,
        networkStatus: 'offline',
        lastHealthCheck: new Date(),
      },
      config: {
        headless: true,
        timeout: 3600,
        retryCount: 3,
      },
    }
  }

  /**
   * 获取当前状态
   */
  getState(): AppState {
    return { ...this.state }
  }

  /**
   * 获取状态的某个部分
   */
  getPartialState<K extends keyof AppState>(key: K): AppState[K] {
    return { ...this.state[key] }
  }

  /**
   * 更新状态
   */
  updateState(event: StateUpdateEvent): void {
    switch (event.type) {
      case 'service:start':
        this.state.service = {
          ...this.state.service,
          status: 'starting',
          lastStartTime: new Date(),
        }
        break

      case 'service:stop':
        this.state.service = {
          ...this.state.service,
          status: 'stopped',
          uptime: undefined,
        }
        break

      case 'service:error':
        this.state.service = {
          ...this.state.service,
          status: 'error',
          error: event.error,
        }
        break

      case 'task:start':
        this.state.tasks = {
          ...this.state.tasks,
          active: this.state.tasks.active + 1,
          lastTask: event.taskName,
          lastTaskTime: new Date(),
        }
        break

      case 'task:complete':
        this.state.tasks = {
          ...this.state.tasks,
          active: Math.max(0, this.state.tasks.active - 1),
          completed: this.state.tasks.completed + 1,
          lastTask: event.taskName,
          lastTaskTime: new Date(),
        }
        break

      case 'task:fail':
        this.state.tasks = {
          ...this.state.tasks,
          active: Math.max(0, this.state.tasks.active - 1),
          failed: this.state.tasks.failed + 1,
          lastTask: event.taskName,
          lastTaskTime: new Date(),
        }
        break

      case 'health:update':
        this.state.health = {
          ...this.state.health,
          ...event.health,
          lastHealthCheck: new Date(),
        }
        break

      case 'config:update':
        this.state.config = {
          ...this.state.config,
          ...event.config,
        }
        break
    }

    // 通知所有监听器
    this.notifyListeners()
  }

  /**
   * 添加状态监听器
   */
  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)

    // 返回取消订阅函数
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(): void {
    const currentState = this.getState()
    this.listeners.forEach((listener) => {
      try {
        listener(currentState)
      }
      catch (error) {
        console.error('State listener error:', error)
      }
    })
  }

  /**
   * 启动定时更新任务（如更新运行时间）
   */
  startPeriodicUpdates(): void {
    setInterval(() => {
      if (this.state.service.status === 'running' && this.state.service.lastStartTime) {
        const uptime = Math.floor((Date.now() - this.state.service.lastStartTime.getTime()) / 1000)
        this.state.service.uptime = uptime
        this.notifyListeners()
      }
    }, 1000) // 每秒更新一次运行时间
  }
}

// 导出全局状态实例
export const appState = new StateStore()

// 自动启动定时更新
appState.startPeriodicUpdates()

export default appState
