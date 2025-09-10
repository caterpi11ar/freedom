import type { Page } from 'playwright'
import type { LoginConfig, LoginCredentials, LoginDetectionSettings, LoginState } from '../types/LoginTypes'
import type { CanvasController } from './CanvasController'

export interface LoginInteractorOptions {
  config?: Partial<LoginConfig>
  detectionSettings?: Partial<LoginDetectionSettings>
}
/**
 * 登录交互器 - 专门处理Canvas游戏的登录操作
 *
 * 功能包括：
 * - 检测登录界面
 * - 输入用户名密码
 * - 点击登录按钮
 * - 处理服务器选择
 * - 验证登录结果
 */
export declare class LoginInteractor {
  private page
  private canvasController
  private config
  private detectionSettings
  constructor(page: Page, canvasController: CanvasController, options?: LoginInteractorOptions)
  /**
   * 检测是否在登录界面
   * @returns 检测结果和置信度
   */
  detectLoginScreen(): Promise<{
    isLoginScreen: boolean
    confidence: number
  }>
  /**
   * 检测是否在加载状态
   * @returns 是否在加载
   */
  detectLoadingState(): Promise<{
    isLoading: boolean
    confidence: number
  }>
  /**
   * 等待Canvas准备完成
   * @returns 是否准备完成
   */
  waitForCanvasReady(): Promise<boolean>
  /**
   * 输入用户名
   * @param username 用户名
   */
  inputUsername(username: string): Promise<void>
  /**
   * 输入密码
   * @param password 密码
   */
  inputPassword(password: string): Promise<void>
  /**
   * 点击登录按钮
   */
  clickLoginButton(): Promise<void>
  /**
   * 选择服务器 (如果需要)
   */
  selectServer(): Promise<void>
  /**
   * 等待登录结果
   * @returns 登录是否成功
   */
  waitForLoginResult(): Promise<{
    success: boolean
    newState: LoginState
  }>
  /**
   * 执行完整的登录流程
   * @param credentials 登录凭据
   * @returns 登录结果
   */
  performLogin(credentials: LoginCredentials): Promise<{
    success: boolean
    state: LoginState
    message: string
    duration: number
  }>
  /**
   * 获取当前配置
   */
  getConfig(): LoginConfig
  /**
   * 更新配置
   * @param updates 配置更新
   */
  updateConfig(updates: Partial<LoginConfig>): void
  /**
   * 获取检测设置
   */
  getDetectionSettings(): LoginDetectionSettings
  /**
   * 更新检测设置
   * @param updates 设置更新
   */
  updateDetectionSettings(updates: Partial<LoginDetectionSettings>): void
}
// # sourceMappingURL=LoginInteractor.d.ts.map
