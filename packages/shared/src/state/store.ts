import type { AppState, StateBridge, StateListener, StateUpdateEvent } from './types'
import { EventEmitter } from 'node:events'

/**
 * 全局状态存储
 * 使用单例模式确保跨包状态一致性
 */
class GlobalStateStore extends EventEmitter implements StateBridge {
  private state: AppState
  private stateListeners: Set<StateListener> = new Set()

  constructor() {
    super()
    this.state = this.createInitialState()
    this.startPeriodicTasks()
  }

  /**
   * 创建初始状态
   */
  private createInitialState(): AppState {
    return {
      auth: {
        isLoggedIn: false,
      },
      browser: {
        isConnected: false,
        isHeadless: true,
      },
      service: {
        status: 'stopped',
      },
      tasks: {
        active: [],
        completed: [],
        failed: [],
        totalCompleted: 0,
        totalFailed: 0,
      },
      health: {
        networkStatus: 'offline',
        lastHealthCheck: new Date(),
        performance: {},
      },
      config: {
        browser: {
          headless: true,
          timeout: 30000,
        },
        executor: {
          maxConcurrent: 3,
          retryCount: 3,
          retryDelay: 1000,
        },
        general: {
          autoStart: false,
          logLevel: 'info',
        },
      },
      meta: {
        version: '1.0.0',
        lastUpdate: new Date(),
      },
    }
  }

  /**
   * 获取当前状态
   */
  getState(): AppState {
    return JSON.parse(JSON.stringify(this.state)) // 深拷贝
  }

  /**
   * 获取状态分片
   */
  getSlice<K extends keyof AppState>(key: K): AppState[K] {
    return JSON.parse(JSON.stringify(this.state[key]))
  }

  /**
   * 更新状态
   */
  updateState(event: StateUpdateEvent): void {
    switch (event.type) {
      // 认证状态更新
      case 'auth:login':
        this.state.auth = {
          ...this.state.auth,
          isLoggedIn: true,
          username: event.username,
          sessionId: event.sessionId,
          lastLoginTime: new Date(),
        }
        break

      case 'auth:logout':
        this.state.auth = {
          isLoggedIn: false,
        }
        break

      case 'auth:session-update':
        this.state.auth = {
          ...this.state.auth,
          sessionId: event.sessionId,
          sessionExpiry: event.expiry,
        }
        break

      // 浏览器状态更新
      case 'browser:connect':
        this.state.browser = {
          ...this.state.browser,
          isConnected: true,
          pid: event.pid,
          url: event.url,
          lastConnectTime: new Date(),
          connectionError: undefined,
        }
        break

      case 'browser:disconnect':
        this.state.browser = {
          ...this.state.browser,
          isConnected: false,
          pid: undefined,
          connectionError: event.reason,
        }
        break

      case 'browser:error':
        this.state.browser = {
          ...this.state.browser,
          connectionError: event.error,
        }
        break

      // 服务状态更新
      case 'service:start':
        this.state.service = {
          status: 'running',
          pid: event.pid,
          lastStartTime: new Date(),
          uptime: 0,
          error: undefined,
        }
        break

      case 'service:stop':
        this.state.service = {
          status: 'stopped',
          uptime: undefined,
          error: undefined,
        }
        break

      case 'service:error':
        this.state.service = {
          ...this.state.service,
          status: 'error',
          error: event.error,
        }
        break

      // 任务状态更新
      case 'task:create':
        this.state.tasks.active.push(event.task)
        break

      case 'task:start': {
        const startingTask = this.state.tasks.active.find(t => t.id === event.taskId)
        if (startingTask) {
          startingTask.status = 'running'
          startingTask.startTime = new Date()
        }
        break
      }

      case 'task:progress': {
        const progressTask = this.state.tasks.active.find(t => t.id === event.taskId)
        if (progressTask) {
          progressTask.progress = event.progress
        }
        break
      }

      case 'task:complete': {
        const completedTaskIndex = this.state.tasks.active.findIndex(t => t.id === event.taskId)
        if (completedTaskIndex >= 0) {
          const completedTask = this.state.tasks.active.splice(completedTaskIndex, 1)[0]
          completedTask.status = 'completed'
          completedTask.endTime = new Date()
          this.state.tasks.completed.push(completedTask)
          this.state.tasks.totalCompleted++

          // 保持历史记录在合理范围内
          if (this.state.tasks.completed.length > 100) {
            this.state.tasks.completed.shift()
          }
        }
        break
      }

      case 'task:fail': {
        const failedTaskIndex = this.state.tasks.active.findIndex(t => t.id === event.taskId)
        if (failedTaskIndex >= 0) {
          const failedTask = this.state.tasks.active.splice(failedTaskIndex, 1)[0]
          failedTask.status = 'failed'
          failedTask.endTime = new Date()
          failedTask.error = event.error
          this.state.tasks.failed.push(failedTask)
          this.state.tasks.totalFailed++

          // 保持历史记录在合理范围内
          if (this.state.tasks.failed.length > 50) {
            this.state.tasks.failed.shift()
          }
        }
        break
      }

      // 健康状态更新
      case 'health:update':
        this.state.health = {
          ...this.state.health,
          ...event.health,
          lastHealthCheck: new Date(),
        }
        break

      // 配置更新
      case 'config:update':
        this.state.config = this.deepMerge(this.state.config, event.config)
        break
    }

    // 更新元数据
    this.state.meta.lastUpdate = new Date()

    // 通知监听器
    this.notifyListeners(event)

    // 发送事件
    this.emit('state:update', this.getState(), event)
  }

  /**
   * 订阅状态变化
   */
  subscribe(listener: StateListener): () => void {
    this.stateListeners.add(listener)

    return () => {
      this.stateListeners.delete(listener)
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(event?: StateUpdateEvent): void {
    const currentState = this.getState()
    this.stateListeners.forEach((listener) => {
      try {
        listener(currentState, event)
      }
      catch (error) {
        console.error('State listener error:', error)
      }
    })
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target }

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key])
      }
      else {
        result[key] = source[key]
      }
    }

    return result
  }

  /**
   * 启动定时任务
   */
  private startPeriodicTasks(): void {
    // 每秒更新运行时间
    setInterval(() => {
      if (this.state.service.status === 'running' && this.state.service.lastStartTime) {
        const uptime = Math.floor((Date.now() - this.state.service.lastStartTime.getTime()) / 1000)
        this.state.service.uptime = uptime
        this.notifyListeners()
      }
    }, 1000)

    // 每30秒进行健康检查
    setInterval(() => {
      this.updateState({
        type: 'health:update',
        health: {
          lastHealthCheck: new Date(),
        },
      })
    }, 30000)
  }
}

// 导出单例实例
export const globalState = new GlobalStateStore()
export default globalState
