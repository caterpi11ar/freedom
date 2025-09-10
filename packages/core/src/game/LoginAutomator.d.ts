import type { Page } from 'playwright'
import type { CanvasController } from '../canvas/CanvasController'
import type { LoginInteractor, LoginInteractorOptions } from '../canvas/LoginInteractor'
import type { LoginConfig, LoginCredentials, LoginResult, LoginState } from '../types/LoginTypes'
import type { LoginStateManager, LoginStateManagerOptions } from './LoginStateManager'

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
export declare class LoginAutomator {
  private page
  private canvasController
  private loginInteractor
  private stateManager
  private config
  private retryAttempts
  private retryDelay
  constructor(page: Page, options?: LoginAutomatorOptions)
  /**
   * 设置事件处理器
   */
  private setupEventHandlers
  /**
   * 执行登录自动化
   * @param credentials 登录凭据
   * @param onProgress 进度回调 (可选)
   * @returns 登录结果
   */
  login(credentials: LoginCredentials, onProgress?: (progress: LoginProgress) => void): Promise<LoginResult>
  /**
   * 尝试单次登录
   */
  private attemptLogin
  /**
   * 获取进度信息
   */
  private getProgressInfo
  /**
   * 获取当前登录状态
   */
  getCurrentState(): LoginState
  /**
   * 获取当前登录状态详情
   */
  getCurrentStatus(): import('../types/LoginTypes').LoginStatus
  /**
   * 检查是否已登录成功
   */
  isLoggedIn(): boolean
  /**
   * 检查登录是否完成 (成功或失败)
   */
  isLoginCompleted(): boolean
  /**
   * 获取登录进度 (0-100)
   */
  getProgress(): number
  /**
   * 获取登录统计信息
   */
  getStatistics(): {
    totalStates: number
    currentProgress: number
    elapsedTime: number
    averageStateTime: number
  }
  /**
   * 取消登录
   */
  cancelLogin(): Promise<void>
  /**
   * 更新配置
   */
  updateConfig(updates: Partial<LoginConfig>): void
  /**
   * 获取当前配置
   */
  getConfig(): LoginConfig
  /**
   * 获取Canvas控制器 (用于高级操作)
   */
  getCanvasController(): CanvasController
  /**
   * 获取登录交互器 (用于自定义操作)
   */
  getLoginInteractor(): LoginInteractor
  /**
   * 获取状态管理器 (用于状态监听)
   */
  getStateManager(): LoginStateManager
  /**
   * 事件发射器方法 (简化的实现)
   */
  private listeners
  on(event: string, listener: (...args: any[]) => void): void
  off(event: string, listener: (...args: any[]) => void): void
  emit(event: string, ...args: any[]): void
  /**
   * 清理资源
   */
  dispose(): Promise<void>
}
// # sourceMappingURL=LoginAutomator.d.ts.map
