// 登录自动化器 - 游戏登录自动化的主要协调器
import type { Page } from 'playwright'
import type { LoginInteractorOptions } from '../canvas/LoginInteractor'
import type { LoginConfig, LoginCredentials, LoginResult } from '../types/LoginTypes'
import type { LoginStateManagerOptions } from './LoginStateManager'
import { CanvasController } from '../canvas/CanvasController'
import { LoginInteractor } from '../canvas/LoginInteractor'
import { DEFAULT_LOGIN_CONFIG, LoginState } from '../types/LoginTypes'
import { LoginStateManager } from './LoginStateManager'

export interface LoginAutomatorOptions {
  loginConfig?: Partial<LoginConfig>
  interactorOptions?: LoginInteractorOptions
  stateManagerOptions?: LoginStateManagerOptions
  retryAttempts?: number
  retryDelay?: number
}

export interface LoginProgress {
  state: LoginState
  message: string
  progress: number
  elapsedTime: number
}

/**
 * 登录自动化器 - 游戏登录自动化的主要入口点
 *
 * 功能包括：
 * - 协调Canvas控制器和登录交互器
 * - 管理登录状态和进度
 * - 处理登录重试逻辑
 * - 提供登录事件和回调
 */
export class LoginAutomator {
  private page: Page
  private canvasController: CanvasController
  private loginInteractor: LoginInteractor
  private stateManager: LoginStateManager
  private config: LoginConfig
  private retryAttempts: number
  private retryDelay: number

  constructor(page: Page, options: LoginAutomatorOptions = {}) {
    this.page = page
    this.config = {
      ...DEFAULT_LOGIN_CONFIG,
      ...options.loginConfig,
    }

    // 初始化组件
    this.canvasController = new CanvasController(page, this.config.canvasSelector)
    this.loginInteractor = new LoginInteractor(page, this.canvasController, options.interactorOptions)
    this.stateManager = new LoginStateManager(options.stateManagerOptions)

    this.retryAttempts = options.retryAttempts ?? 3
    this.retryDelay = options.retryDelay ?? 2000

    this.setupEventHandlers()
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 转发状态管理器的事件
    this.stateManager.on('stateChanged', (newStatus, oldStatus) => {
      this.emit('stateChanged', newStatus, oldStatus)
    })

    this.stateManager.on('loginSuccess', (status) => {
      this.emit('loginSuccess', status)
    })

    this.stateManager.on('loginFailed', (status) => {
      this.emit('loginFailed', status)
    })
  }

  /**
   * 执行登录自动化
   * @param credentials 登录凭据
   * @param onProgress 进度回调 (可选)
   * @returns 登录结果
   */
  async login(
    credentials: LoginCredentials,
    onProgress?: (progress: LoginProgress) => void,
  ): Promise<LoginResult> {
    let currentAttempt = 0
    let lastError: Error | undefined

    // 重置状态管理器
    await this.stateManager.reset()

    while (currentAttempt < this.retryAttempts) {
      currentAttempt++

      try {
        const result = await this.attemptLogin(credentials, onProgress, currentAttempt)

        if (result.success) {
          return result
        }

        // 如果不是最后一次尝试，等待后重试
        if (currentAttempt < this.retryAttempts) {
          await this.stateManager.updateState(
            LoginState.INITIAL,
            `登录失败，${this.retryDelay / 1000}秒后重试 (${currentAttempt}/${this.retryAttempts})`,
            result.error?.message,
          )

          if (onProgress) {
            onProgress(this.getProgressInfo())
          }

          await this.page.waitForTimeout(this.retryDelay)
        }

        lastError = result.error
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        await this.stateManager.setLoginFailed(
          `登录过程中发生异常: ${lastError.message}`,
          lastError.message,
        )

        if (currentAttempt < this.retryAttempts) {
          await this.page.waitForTimeout(this.retryDelay)
        }
      }
    }

    // 所有尝试都失败了
    return {
      success: false,
      state: LoginState.LOGIN_FAILED,
      message: `登录失败，已尝试 ${this.retryAttempts} 次`,
      duration: this.stateManager.getElapsedTime(),
      error: lastError,
    }
  }

  /**
   * 尝试单次登录
   */
  private async attemptLogin(
    credentials: LoginCredentials,
    onProgress?: (progress: LoginProgress) => void,
    attemptNumber: number = 1,
  ): Promise<LoginResult> {
    // 1. 开始登录流程
    await this.stateManager.startLogin()
    if (onProgress)
      onProgress(this.getProgressInfo())

    // 2. 导航到游戏页面
    try {
      await this.page.goto(this.config.gameUrl, {
        waitUntil: 'networkidle',
        timeout: this.config.timeouts.pageLoad,
      })
    }
    catch (error) {
      await this.stateManager.setLoginFailed(
        '无法加载游戏页面',
        error instanceof Error ? error.message : String(error),
      )
      return this.stateManager.getLoginResult()
    }

    // 3. 等待Canvas加载
    await this.stateManager.setCanvasLoading()
    if (onProgress)
      onProgress(this.getProgressInfo())

    const canvasReady = await this.loginInteractor.waitForCanvasReady()
    if (!canvasReady) {
      await this.stateManager.setLoginFailed(
        'Canvas未能在指定时间内准备完成',
      )
      return this.stateManager.getLoginResult()
    }

    // 4. 检测登录界面
    await this.stateManager.setLoginScreen()
    if (onProgress)
      onProgress(this.getProgressInfo())

    const loginDetection = await this.loginInteractor.detectLoginScreen()
    if (!loginDetection.isLoginScreen) {
      await this.stateManager.setLoginFailed(
        `未检测到登录界面 (置信度: ${(loginDetection.confidence * 100).toFixed(1)}%)`,
      )
      return this.stateManager.getLoginResult()
    }

    // 5. 输入登录凭据
    await this.stateManager.setEnteringCredentials()
    if (onProgress)
      onProgress(this.getProgressInfo())

    try {
      await this.loginInteractor.inputUsername(credentials.username)
      await this.loginInteractor.inputPassword(credentials.password)
    }
    catch (error) {
      await this.stateManager.setLoginFailed(
        '输入凭据时发生错误',
        error instanceof Error ? error.message : String(error),
      )
      return this.stateManager.getLoginResult()
    }

    // 6. 点击登录按钮
    await this.stateManager.setLoggingIn()
    if (onProgress)
      onProgress(this.getProgressInfo())

    try {
      await this.loginInteractor.clickLoginButton()
    }
    catch (error) {
      await this.stateManager.setLoginFailed(
        '点击登录按钮时发生错误',
        error instanceof Error ? error.message : String(error),
      )
      return this.stateManager.getLoginResult()
    }

    // 7. 等待登录结果
    const loginResult = await this.loginInteractor.waitForLoginResult()
    if (!loginResult.success) {
      await this.stateManager.setLoginFailed(
        `登录验证失败 (尝试 ${attemptNumber})`,
      )
      return this.stateManager.getLoginResult()
    }

    // 8. 处理服务器选择
    await this.stateManager.setServerSelect()
    if (onProgress)
      onProgress(this.getProgressInfo())

    try {
      await this.loginInteractor.selectServer()
    }
    catch (error) {
      // 服务器选择失败不一定是致命错误，记录但继续
      console.warn('服务器选择时发生警告:', error)
    }

    // 9. 登录成功
    await this.stateManager.setLoginSuccess()
    if (onProgress)
      onProgress(this.getProgressInfo())

    return this.stateManager.getLoginResult()
  }

  /**
   * 获取进度信息
   */
  private getProgressInfo(): LoginProgress {
    const status = this.stateManager.getCurrentStatus()
    const progress = this.stateManager.getProgress()
    const elapsedTime = this.stateManager.getElapsedTime()

    return {
      state: status.state,
      message: status.message,
      progress,
      elapsedTime,
    }
  }

  /**
   * 获取当前登录状态
   */
  getCurrentState(): LoginState {
    return this.stateManager.getCurrentState()
  }

  /**
   * 获取当前登录状态详情
   */
  getCurrentStatus() {
    return this.stateManager.getCurrentStatus()
  }

  /**
   * 检查是否已登录成功
   */
  isLoggedIn(): boolean {
    return this.stateManager.isLoginSuccessful()
  }

  /**
   * 检查登录是否完成 (成功或失败)
   */
  isLoginCompleted(): boolean {
    return this.stateManager.isLoginCompleted()
  }

  /**
   * 获取登录进度 (0-100)
   */
  getProgress(): number {
    return this.stateManager.getProgress()
  }

  /**
   * 获取登录统计信息
   */
  getStatistics() {
    return this.stateManager.getStatistics()
  }

  /**
   * 取消登录
   */
  async cancelLogin(): Promise<void> {
    await this.stateManager.setLoginFailed('用户取消登录', 'User cancelled')
    this.emit('loginCancelled', this.stateManager.getCurrentStatus())
  }

  /**
   * 更新配置
   */
  updateConfig(updates: Partial<LoginConfig>): void {
    this.config = { ...this.config, ...updates }
    this.loginInteractor.updateConfig(updates)
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoginConfig {
    return { ...this.config }
  }

  /**
   * 获取Canvas控制器 (用于高级操作)
   */
  getCanvasController(): CanvasController {
    return this.canvasController
  }

  /**
   * 获取登录交互器 (用于自定义操作)
   */
  getLoginInteractor(): LoginInteractor {
    return this.loginInteractor
  }

  /**
   * 获取状态管理器 (用于状态监听)
   */
  getStateManager(): LoginStateManager {
    return this.stateManager
  }

  /**
   * 事件发射器方法 (简化的实现)
   */
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map()

  on(event: string, listener: (...args: any[]) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(listener)
  }

  off(event: string, listener: (...args: any[]) => void): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      const index = eventListeners.indexOf(listener)
      if (index !== -1) {
        eventListeners.splice(index, 1)
      }
    }
  }

  emit(event: string, ...args: any[]): void {
    const eventListeners = this.listeners.get(event)
    if (eventListeners) {
      eventListeners.forEach((listener) => {
        try {
          listener(...args)
        }
        catch (error) {
          console.error(`Error in event listener for ${event}:`, error)
        }
      })
    }
  }

  /**
   * 清理资源
   */
  async dispose(): Promise<void> {
    this.stateManager.dispose()
    await this.canvasController.dispose()
    this.listeners.clear()
  }
}
