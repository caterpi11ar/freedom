// 登录专用交互器 - 基于Canvas的游戏登录操作
import type { Page } from 'playwright'

import type { LoginConfig, LoginCredentials, LoginDetectionSettings } from '../types/LoginTypes'
import type { CanvasController, GameCoordinate } from './CanvasController'
import { DEFAULT_DETECTION_SETTINGS, DEFAULT_LOGIN_CONFIG, LoginState } from '../types/LoginTypes'

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
export class LoginInteractor {
  private page: Page
  private canvasController: CanvasController
  private config: LoginConfig
  private detectionSettings: LoginDetectionSettings

  constructor(
    page: Page,
    canvasController: CanvasController,
    options: LoginInteractorOptions = {},
  ) {
    this.page = page
    this.canvasController = canvasController

    // 合并配置
    this.config = {
      ...DEFAULT_LOGIN_CONFIG,
      ...options.config,
      coordinates: {
        ...DEFAULT_LOGIN_CONFIG.coordinates,
        ...options.config?.coordinates,
      },
      timeouts: {
        ...DEFAULT_LOGIN_CONFIG.timeouts,
        ...options.config?.timeouts,
      },
    }

    // 合并检测设置
    this.detectionSettings = {
      ...DEFAULT_DETECTION_SETTINGS,
      ...options.detectionSettings,
      loginScreenDetection: {
        ...DEFAULT_DETECTION_SETTINGS.loginScreenDetection,
        ...options.detectionSettings?.loginScreenDetection,
      },
      loadingDetection: {
        ...DEFAULT_DETECTION_SETTINGS.loadingDetection,
        ...options.detectionSettings?.loadingDetection,
      },
    }
  }

  /**
   * 检测是否在登录界面
   * @returns 检测结果和置信度
   */
  async detectLoginScreen(): Promise<{ isLoginScreen: boolean, confidence: number }> {
    try {
      let totalPoints = 0
      let matchedPoints = 0

      for (const checkPoint of this.detectionSettings.loginScreenDetection.checkPoints) {
        totalPoints++

        const actualColor = await this.canvasController.sampleColor({
          x: checkPoint.x,
          y: checkPoint.y,
        })

        // 计算颜色差异
        const colorDiff = Math.sqrt(
          (actualColor.r - checkPoint.expectedColor.r) ** 2
          + (actualColor.g - checkPoint.expectedColor.g) ** 2
          + (actualColor.b - checkPoint.expectedColor.b) ** 2,
        )

        if (colorDiff <= checkPoint.tolerance) {
          matchedPoints++
        }
      }

      const confidence = totalPoints > 0 ? matchedPoints / totalPoints : 0
      const isLoginScreen = confidence >= 0.6 // 60%以上匹配认为是登录界面

      return { isLoginScreen, confidence }
    }
    catch {
      return { isLoginScreen: false, confidence: 0 }
    }
  }

  /**
   * 检测是否在加载状态
   * @returns 是否在加载
   */
  async detectLoadingState(): Promise<{ isLoading: boolean, confidence: number }> {
    try {
      let totalPoints = 0
      let matchedPoints = 0

      for (const checkPoint of this.detectionSettings.loadingDetection.checkPoints) {
        totalPoints++

        const actualColor = await this.canvasController.sampleColor({
          x: checkPoint.x,
          y: checkPoint.y,
        })

        const colorDiff = Math.sqrt(
          (actualColor.r - checkPoint.expectedColor.r) ** 2
          + (actualColor.g - checkPoint.expectedColor.g) ** 2
          + (actualColor.b - checkPoint.expectedColor.b) ** 2,
        )

        if (colorDiff <= checkPoint.tolerance) {
          matchedPoints++
        }
      }

      const confidence = totalPoints > 0 ? matchedPoints / totalPoints : 0
      const isLoading = confidence >= 0.5 // 50%以上匹配认为在加载

      return { isLoading, confidence }
    }
    catch {
      return { isLoading: false, confidence: 0 }
    }
  }

  /**
   * 等待Canvas准备完成
   * @returns 是否准备完成
   */
  async waitForCanvasReady(): Promise<boolean> {
    return await this.canvasController.waitForCanvasReady(this.config.timeouts.canvasReady)
  }

  /**
   * 输入用户名
   * @param username 用户名
   */
  async inputUsername(username: string): Promise<void> {
    const coord: GameCoordinate = this.config.coordinates.usernameInput

    // 点击用户名输入框
    await this.canvasController.clickAt(coord)
    await this.page.waitForTimeout(500)

    // 清空现有内容 (Ctrl+A然后输入)
    await this.page.keyboard.press('Control+KeyA')
    await this.page.waitForTimeout(200)

    // 输入用户名
    await this.page.keyboard.type(username, { delay: 100 })
    await this.page.waitForTimeout(300)
  }

  /**
   * 输入密码
   * @param password 密码
   */
  async inputPassword(password: string): Promise<void> {
    const coord: GameCoordinate = this.config.coordinates.passwordInput

    // 点击密码输入框
    await this.canvasController.clickAt(coord)
    await this.page.waitForTimeout(500)

    // 清空现有内容
    await this.page.keyboard.press('Control+KeyA')
    await this.page.waitForTimeout(200)

    // 输入密码
    await this.page.keyboard.type(password, { delay: 100 })
    await this.page.waitForTimeout(300)
  }

  /**
   * 点击登录按钮
   */
  async clickLoginButton(): Promise<void> {
    const coord: GameCoordinate = this.config.coordinates.loginButton
    await this.canvasController.clickAt(coord)
    await this.page.waitForTimeout(500)
  }

  /**
   * 选择服务器 (如果需要)
   */
  async selectServer(): Promise<void> {
    if (!this.config.coordinates.serverSelect) {
      return
    }

    // 点击服务器选择
    await this.canvasController.clickAt(this.config.coordinates.serverSelect)
    await this.page.waitForTimeout(1000)

    // 点击确认按钮 (如果有)
    if (this.config.coordinates.confirmButton) {
      await this.canvasController.clickAt(this.config.coordinates.confirmButton)
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * 等待登录结果
   * @returns 登录是否成功
   */
  async waitForLoginResult(): Promise<{ success: boolean, newState: LoginState }> {
    const startTime = Date.now()
    const timeout = this.config.timeouts.loginResponse

    while (Date.now() - startTime < timeout) {
      // 检查是否还在登录界面
      const loginDetection = await this.detectLoginScreen()

      // 如果不再是登录界面，说明登录可能成功了
      if (!loginDetection.isLoginScreen) {
        // 检查是否在加载状态
        const loadingDetection = await this.detectLoadingState()

        if (loadingDetection.isLoading) {
          // 仍在加载，继续等待
          await this.page.waitForTimeout(1000)
          continue
        }

        // 不在登录界面也不在加载，认为登录成功
        return {
          success: true,
          newState: LoginState.LOGIN_SUCCESS,
        }
      }

      // 还在登录界面，继续等待
      await this.page.waitForTimeout(1000)
    }

    // 超时，认为登录失败
    return {
      success: false,
      newState: LoginState.LOGIN_FAILED,
    }
  }

  /**
   * 执行完整的登录流程
   * @param credentials 登录凭据
   * @returns 登录结果
   */
  async performLogin(credentials: LoginCredentials): Promise<{
    success: boolean
    state: LoginState
    message: string
    duration: number
  }> {
    const startTime = Date.now()

    try {
      // 1. 等待Canvas准备
      const canvasReady = await this.waitForCanvasReady()
      if (!canvasReady) {
        return {
          success: false,
          state: LoginState.CANVAS_LOADING,
          message: 'Canvas未能在指定时间内准备完成',
          duration: Date.now() - startTime,
        }
      }

      // 2. 检测登录界面
      const loginDetection = await this.detectLoginScreen()
      if (!loginDetection.isLoginScreen) {
        return {
          success: false,
          state: LoginState.UNKNOWN,
          message: `未检测到登录界面 (置信度: ${(loginDetection.confidence * 100).toFixed(1)}%)`,
          duration: Date.now() - startTime,
        }
      }

      // 3. 输入用户名
      await this.inputUsername(credentials.username)

      // 4. 输入密码
      await this.inputPassword(credentials.password)

      // 5. 点击登录按钮
      await this.clickLoginButton()

      // 6. 等待登录结果
      const loginResult = await this.waitForLoginResult()

      if (!loginResult.success) {
        return {
          success: false,
          state: loginResult.newState,
          message: '登录失败或超时',
          duration: Date.now() - startTime,
        }
      }

      // 7. 处理服务器选择 (如果需要)
      await this.selectServer()

      return {
        success: true,
        state: LoginState.LOGIN_SUCCESS,
        message: '登录成功',
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        state: LoginState.LOGIN_FAILED,
        message: `登录过程中发生错误: ${error instanceof Error ? error.message : String(error)}`,
        duration: Date.now() - startTime,
      }
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): LoginConfig {
    return { ...this.config }
  }

  /**
   * 更新配置
   * @param updates 配置更新
   */
  updateConfig(updates: Partial<LoginConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      coordinates: {
        ...this.config.coordinates,
        ...updates.coordinates,
      },
      timeouts: {
        ...this.config.timeouts,
        ...updates.timeouts,
      },
    }
  }

  /**
   * 获取检测设置
   */
  getDetectionSettings(): LoginDetectionSettings {
    return { ...this.detectionSettings }
  }

  /**
   * 更新检测设置
   * @param updates 设置更新
   */
  updateDetectionSettings(updates: Partial<LoginDetectionSettings>): void {
    this.detectionSettings = {
      ...this.detectionSettings,
      ...updates,
      loginScreenDetection: {
        ...this.detectionSettings.loginScreenDetection,
        ...updates.loginScreenDetection,
      },
      loadingDetection: {
        ...this.detectionSettings.loadingDetection,
        ...updates.loadingDetection,
      },
    }
  }
}
