export interface AutomationConfig {
  headless?: boolean
  timeout?: number
  slowMo?: number
}
export declare class AutomationCore {
  private config
  constructor(config?: AutomationConfig)
  getConfig(): AutomationConfig
  updateConfig(updates: Partial<AutomationConfig>): void
}
export declare const automationCore: AutomationCore
export { CanvasController } from './canvas/CanvasController'
export type { CanvasInfo, ClickOptions, DragOptions, GameCoordinate, ScreenshotArea } from './canvas/CanvasController'
export { LoginInteractor } from './canvas/LoginInteractor'
export type { LoginInteractorOptions } from './canvas/LoginInteractor'
export { GameStateManager } from './game/GameStateManager'
export type { GameState, StateTransition } from './game/GameStateManager'
export { GameScene } from './game/GameStateManager'
export { LoginAutomator } from './game/LoginAutomator'
export type { LoginAutomatorOptions, LoginProgress } from './game/LoginAutomator'
export { LoginStateManager } from './game/LoginStateManager'
export type { LoginStateManagerOptions } from './game/LoginStateManager'
export type { LoginConfig, LoginCredentials, LoginDetectionSettings, LoginResult, LoginStatus } from './types/LoginTypes'
export { DEFAULT_DETECTION_SETTINGS, DEFAULT_LOGIN_CONFIG, LoginState } from './types/LoginTypes'
// # sourceMappingURL=index.d.ts.map
