import type { LoginResult, LoginStatus } from '../types/LoginTypes'
// 登录状态管理器 - 专门管理游戏登录过程中的状态变化
import { EventEmitter } from 'node:events'
import { LoginState } from '../types/LoginTypes'

export interface LoginStateManagerOptions {
  enableHistory?: boolean
  maxHistoryLength?: number
}

/**
 * 登录状态管理器
 *
 * 功能包括：
 * - 登录状态跟踪
 * - 状态变化事件通知
 * - 登录进度监控
 * - 状态历史记录
 */
export class LoginStateManager extends EventEmitter {
  private currentStatus: LoginStatus
  private statusHistory: LoginStatus[] = []
  private maxHistoryLength: number
  private enableHistory: boolean
  private loginStartTime: number | null = null

  constructor(options: LoginStateManagerOptions = {}) {
    super()

    this.enableHistory = options.enableHistory ?? true
    this.maxHistoryLength = options.maxHistoryLength ?? 20

    this.currentStatus = this.getInitialStatus()
  }

  /**
   * 获取初始状态
   */
  private getInitialStatus(): LoginStatus {
    return {
      state: LoginState.INITIAL,
      message: '等待开始登录',
      timestamp: Date.now(),
      success: false,
    }
  }

  /**
   * 更新登录状态
   * @param newState 新状态
   * @param message 状态消息
   * @param error 错误信息 (可选)
   */
  async updateState(
    newState: LoginState,
    message: string,
    error?: string,
  ): Promise<LoginStatus> {
    const previousStatus = { ...this.currentStatus }

    // 创建新状态
    this.currentStatus = {
      state: newState,
      message,
      timestamp: Date.now(),
      success: newState === LoginState.LOGIN_SUCCESS,
      error,
    }

    // 添加到历史记录
    if (this.enableHistory) {
      this.addToHistory(this.currentStatus)
    }

    // 如果是开始登录，记录开始时间
    if (newState === LoginState.LOADING_PAGE && !this.loginStartTime) {
      this.loginStartTime = Date.now()
    }

    // 发出事件
    this.emit('stateChanged', this.currentStatus, previousStatus)
    this.emit(`state:${newState}`, this.currentStatus)

    // 特殊事件
    if (newState === LoginState.LOGIN_SUCCESS) {
      this.emit('loginSuccess', this.currentStatus)
    }
    else if (newState === LoginState.LOGIN_FAILED) {
      this.emit('loginFailed', this.currentStatus)
    }

    return this.currentStatus
  }

  /**
   * 获取当前状态
   */
  getCurrentStatus(): LoginStatus {
    return { ...this.currentStatus }
  }

  /**
   * 获取当前登录状态
   */
  getCurrentState(): LoginState {
    return this.currentStatus.state
  }

  /**
   * 检查是否处于指定状态
   */
  isInState(state: LoginState): boolean {
    return this.currentStatus.state === state
  }

  /**
   * 检查是否处于任一指定状态
   */
  isInAnyState(states: LoginState[]): boolean {
    return states.includes(this.currentStatus.state)
  }

  /**
   * 检查登录是否完成 (成功或失败)
   */
  isLoginCompleted(): boolean {
    return this.isInAnyState([
      LoginState.LOGIN_SUCCESS,
      LoginState.LOGIN_FAILED,
    ])
  }

  /**
   * 检查登录是否成功
   */
  isLoginSuccessful(): boolean {
    return this.currentStatus.success
  }

  /**
   * 等待进入指定状态
   * @param targetState 目标状态
   * @param timeout 超时时间 (毫秒)
   * @returns 是否成功进入目标状态
   */
  async waitForState(targetState: LoginState, timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      // 如果已经在目标状态，立即返回
      if (this.currentStatus.state === targetState) {
        resolve(true)
        return
      }

      let timer: NodeJS.Timeout | null = null

      const onStateChanged = (_newStatus: LoginStatus) => {
        if (_newStatus.state === targetState) {
          if (timer)
            clearTimeout(timer)
          this.off('stateChanged', onStateChanged)
          resolve(true)
        }
      }

      // 监听状态变化
      this.on('stateChanged', onStateChanged)

      // 设置超时
      timer = setTimeout(() => {
        this.off('stateChanged', onStateChanged)
        resolve(false)
      }, timeout)
    })
  }

  /**
   * 等待登录完成 (成功或失败)
   * @param timeout 超时时间
   */
  async waitForLoginComplete(timeout: number = 60000): Promise<LoginResult> {
    return new Promise((resolve) => {
      // 如果已经完成，立即返回
      if (this.isLoginCompleted()) {
        resolve(this.getLoginResult())
        return
      }

      let timer: NodeJS.Timeout | null = null

      const onStateChanged = (_newStatus: LoginStatus) => {
        if (this.isLoginCompleted()) {
          if (timer)
            clearTimeout(timer)
          this.off('stateChanged', onStateChanged)
          resolve(this.getLoginResult())
        }
      }

      this.on('stateChanged', onStateChanged)

      timer = setTimeout(() => {
        this.off('stateChanged', onStateChanged)

        // 超时情况下更新状态为失败
        this.updateState(
          LoginState.LOGIN_FAILED,
          '登录超时',
          'Login timeout',
        )

        resolve(this.getLoginResult())
      }, timeout)
    })
  }

  /**
   * 获取登录结果
   */
  getLoginResult(): LoginResult {
    const duration = this.loginStartTime
      ? Date.now() - this.loginStartTime
      : 0

    return {
      success: this.currentStatus.success,
      state: this.currentStatus.state,
      message: this.currentStatus.message,
      duration,
      error: this.currentStatus.error
        ? new Error(this.currentStatus.error)
        : undefined,
    }
  }

  /**
   * 开始登录流程
   */
  async startLogin(): Promise<void> {
    this.loginStartTime = Date.now()
    await this.updateState(
      LoginState.LOADING_PAGE,
      '开始加载游戏页面',
    )
  }

  /**
   * 标记Canvas加载中
   */
  async setCanvasLoading(): Promise<void> {
    await this.updateState(
      LoginState.CANVAS_LOADING,
      'Canvas正在加载',
    )
  }

  /**
   * 标记到达登录界面
   */
  async setLoginScreen(): Promise<void> {
    await this.updateState(
      LoginState.LOGIN_SCREEN,
      '已检测到登录界面',
    )
  }

  /**
   * 标记正在输入凭据
   */
  async setEnteringCredentials(): Promise<void> {
    await this.updateState(
      LoginState.ENTERING_CREDENTIALS,
      '正在输入用户名和密码',
    )
  }

  /**
   * 标记正在登录
   */
  async setLoggingIn(): Promise<void> {
    await this.updateState(
      LoginState.LOGGING_IN,
      '正在处理登录请求',
    )
  }

  /**
   * 标记服务器选择
   */
  async setServerSelect(): Promise<void> {
    await this.updateState(
      LoginState.SERVER_SELECT,
      '正在选择服务器',
    )
  }

  /**
   * 标记登录成功
   */
  async setLoginSuccess(message: string = '登录成功'): Promise<void> {
    await this.updateState(
      LoginState.LOGIN_SUCCESS,
      message,
    )
  }

  /**
   * 标记登录失败
   */
  async setLoginFailed(message: string, error?: string): Promise<void> {
    await this.updateState(
      LoginState.LOGIN_FAILED,
      message,
      error,
    )
  }

  /**
   * 标记需要验证
   */
  async setNeedVerification(message: string = '需要额外验证'): Promise<void> {
    await this.updateState(
      LoginState.NEED_VERIFICATION,
      message,
    )
  }

  /**
   * 重置登录状态
   */
  async reset(): Promise<void> {
    this.loginStartTime = null
    this.currentStatus = this.getInitialStatus()

    if (this.enableHistory) {
      this.statusHistory = []
    }

    this.emit('reset', this.currentStatus)
  }

  /**
   * 获取状态历史
   */
  getStatusHistory(): LoginStatus[] {
    return [...this.statusHistory]
  }

  /**
   * 获取登录进度 (0-100)
   * 基于当前状态计算进度百分比
   */
  getProgress(): number {
    const stateProgress: Record<LoginState, number> = {
      [LoginState.INITIAL]: 0,
      [LoginState.LOADING_PAGE]: 10,
      [LoginState.CANVAS_LOADING]: 20,
      [LoginState.LOGIN_SCREEN]: 30,
      [LoginState.ENTERING_CREDENTIALS]: 50,
      [LoginState.LOGGING_IN]: 70,
      [LoginState.SERVER_SELECT]: 85,
      [LoginState.LOGIN_SUCCESS]: 100,
      [LoginState.LOGIN_FAILED]: 0,
      [LoginState.NEED_VERIFICATION]: 60,
      [LoginState.UNKNOWN]: 0,
    }

    return stateProgress[this.currentStatus.state] || 0
  }

  /**
   * 获取登录耗时 (毫秒)
   */
  getElapsedTime(): number {
    return this.loginStartTime
      ? Date.now() - this.loginStartTime
      : 0
  }

  /**
   * 获取状态统计
   */
  getStatistics(): {
    totalStates: number
    currentProgress: number
    elapsedTime: number
    averageStateTime: number
  } {
    const totalStates = this.statusHistory.length
    const currentProgress = this.getProgress()
    const elapsedTime = this.getElapsedTime()

    // 计算平均状态持续时间
    let averageStateTime = 0
    if (totalStates > 1) {
      let totalTime = 0
      for (let i = 1; i < this.statusHistory.length; i++) {
        totalTime += this.statusHistory[i].timestamp - this.statusHistory[i - 1].timestamp
      }
      averageStateTime = totalTime / (totalStates - 1)
    }

    return {
      totalStates,
      currentProgress,
      elapsedTime,
      averageStateTime,
    }
  }

  /**
   * 添加状态到历史记录
   */
  private addToHistory(status: LoginStatus): void {
    this.statusHistory.push({ ...status })

    // 保持历史记录长度
    if (this.statusHistory.length > this.maxHistoryLength) {
      this.statusHistory.shift()
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.removeAllListeners()
    this.statusHistory = []
    this.loginStartTime = null
  }
}
