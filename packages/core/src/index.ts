// Core automation framework for Freedom project

export interface AutomationConfig {
  headless?: boolean
  timeout?: number
  slowMo?: number
}

export class AutomationCore {
  private config: AutomationConfig

  constructor(config: AutomationConfig = {}) {
    this.config = {
      headless: true,
      timeout: 30000,
      slowMo: 0,
      ...config,
    }
  }

  getConfig(): AutomationConfig {
    return { ...this.config }
  }

  updateConfig(updates: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...updates }
  }
}

export const automationCore = new AutomationCore()

// Canvas控制器
export { CanvasController } from './canvas/CanvasController'
export type { CanvasInfo, ClickOptions, DragOptions, GameCoordinate, ScreenshotArea } from './canvas/CanvasController'

// 登录相关
export { LoginInteractor } from './canvas/LoginInteractor'
export type { LoginInteractorOptions } from './canvas/LoginInteractor'

export { GameStateManager } from './game/GameStateManager'
export type { GameState, StateTransition } from './game/GameStateManager'

export { GameScene } from './game/GameStateManager'
export { LoginAutomator } from './game/LoginAutomator'

export type { LoginAutomatorOptions, LoginProgress } from './game/LoginAutomator'
export { LoginStateManager } from './game/LoginStateManager'
export type { LoginStateManagerOptions } from './game/LoginStateManager'

// 登录类型
export type {
  LoginConfig,
  LoginCredentials,
  LoginDetectionSettings,
  LoginResult,
  LoginStatus,
} from './types/LoginTypes'
export { DEFAULT_DETECTION_SETTINGS, DEFAULT_LOGIN_CONFIG, LoginState } from './types/LoginTypes'
