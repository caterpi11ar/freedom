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

// 账户管理
export { AccountManager, AccountStatus, RotationStrategy } from './account/AccountManager'
export type { AccountManagerConfig, Logger } from './account/AccountManager'

export type { AccountGroup, AccountHealthCheck, AccountConfig as AccountManagerConfig2 } from './account/AccountManager'
// 浏览器会话管理
export * from './browser'

// Canvas控制器
export { CanvasController } from './canvas/CanvasController'
export type { CanvasInfo, ClickOptions, DragOptions, GameCoordinate, ScreenshotArea } from './canvas/CanvasController'

// 登录相关
export { LoginInteractor } from './canvas/LoginInteractor'
export type { LoginInteractorOptions } from './canvas/LoginInteractor'

// 配置管理
export { ConfigManager, configManager } from './config/ConfigManager'
export type { SystemConfig as ConfigSystemConfig, FreedomConfig, SimpleAccountConfig } from './config/ConfigManager'
// 系统配置管理
export { SystemConfigManager, systemConfigManager } from './config/SystemConfig'

export type { AppPreferences, GlobalConfig, SystemConfig } from './config/SystemConfig'
export { GameStateManager } from './game/GameStateManager'

export type { GameState, StateTransition } from './game/GameStateManager'

export { GameScene } from './game/GameStateManager'

export { LoginAutomator } from './game/LoginAutomator'
export type { LoginAutomatorOptions, LoginProgress } from './game/LoginAutomator'
export { LoginStateManager } from './game/LoginStateManager'

export type { LoginStateManagerOptions } from './game/LoginStateManager'
// 脚本模板管理
export { ScriptTemplateManager, scriptTemplateManager } from './script/ScriptTemplateManager'

export type {
  ActionConfig,
  ConditionConfig,
  LoopConfig,
  ScriptCategory,
  ScriptCondition,
  ScriptStep,
  ScriptTemplate,
  ScriptTemplateContent,
  ScriptVariable,
  TemplateFilter,
  TemplateStats,
} from './script/ScriptTemplateManager'
// 数据存储
export * from './storage'

// 登录类型
export type {
  LoginConfig,
  LoginCredentials,
  LoginDetectionSettings,
  LoginResult,
  LoginStatus,
} from './types/LoginTypes'
export { DEFAULT_DETECTION_SETTINGS, DEFAULT_LOGIN_CONFIG, LoginState } from './types/LoginTypes'
