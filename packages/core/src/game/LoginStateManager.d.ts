import type { LoginResult, LoginState, LoginStatus } from '../types/LoginTypes'
import { EventEmitter } from 'node:events'

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
export declare class LoginStateManager extends EventEmitter {
  private currentStatus
  private statusHistory
  private maxHistoryLength
  private enableHistory
  private loginStartTime
  constructor(options?: LoginStateManagerOptions)
  /**
   * 获取初始状态
   */
  private getInitialStatus
  /**
   * 更新登录状态
   * @param newState 新状态
   * @param message 状态消息
   * @param error 错误信息 (可选)
   */
  updateState(newState: LoginState, message: string, error?: string): Promise<LoginStatus>
  /**
   * 获取当前状态
   */
  getCurrentStatus(): LoginStatus
  /**
   * 获取当前登录状态
   */
  getCurrentState(): LoginState
  /**
   * 检查是否处于指定状态
   */
  isInState(state: LoginState): boolean
  /**
   * 检查是否处于任一指定状态
   */
  isInAnyState(states: LoginState[]): boolean
  /**
   * 检查登录是否完成 (成功或失败)
   */
  isLoginCompleted(): boolean
  /**
   * 检查登录是否成功
   */
  isLoginSuccessful(): boolean
  /**
   * 等待进入指定状态
   * @param targetState 目标状态
   * @param timeout 超时时间 (毫秒)
   * @returns 是否成功进入目标状态
   */
  waitForState(targetState: LoginState, timeout?: number): Promise<boolean>
  /**
   * 等待登录完成 (成功或失败)
   * @param timeout 超时时间
   */
  waitForLoginComplete(timeout?: number): Promise<LoginResult>
  /**
   * 获取登录结果
   */
  getLoginResult(): LoginResult
  /**
   * 开始登录流程
   */
  startLogin(): Promise<void>
  /**
   * 标记Canvas加载中
   */
  setCanvasLoading(): Promise<void>
  /**
   * 标记到达登录界面
   */
  setLoginScreen(): Promise<void>
  /**
   * 标记正在输入凭据
   */
  setEnteringCredentials(): Promise<void>
  /**
   * 标记正在登录
   */
  setLoggingIn(): Promise<void>
  /**
   * 标记服务器选择
   */
  setServerSelect(): Promise<void>
  /**
   * 标记登录成功
   */
  setLoginSuccess(message?: string): Promise<void>
  /**
   * 标记登录失败
   */
  setLoginFailed(message: string, error?: string): Promise<void>
  /**
   * 标记需要验证
   */
  setNeedVerification(message?: string): Promise<void>
  /**
   * 重置登录状态
   */
  reset(): Promise<void>
  /**
   * 获取状态历史
   */
  getStatusHistory(): LoginStatus[]
  /**
   * 获取登录进度 (0-100)
   * 基于当前状态计算进度百分比
   */
  getProgress(): number
  /**
   * 获取登录耗时 (毫秒)
   */
  getElapsedTime(): number
  /**
   * 获取状态统计
   */
  getStatistics(): {
    totalStates: number
    currentProgress: number
    elapsedTime: number
    averageStateTime: number
  }
  /**
   * 添加状态到历史记录
   */
  private addToHistory
  /**
   * 清理资源
   */
  dispose(): void
}
// # sourceMappingURL=LoginStateManager.d.ts.map
