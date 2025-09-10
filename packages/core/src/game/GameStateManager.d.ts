import { EventEmitter } from 'node:events'

export declare enum GameScene {
  LOGIN = 'login',
  CHARACTER_SELECT = 'character_select',
  SERVER_SELECT = 'server_select',
  MAIN_MENU = 'main_menu',
  WORLD = 'world',
  BATTLE = 'battle',
  INVENTORY = 'inventory',
  CHARACTER_PANEL = 'character_panel',
  ADVENTURE_HANDBOOK = 'adventure_handbook',
  SHOP = 'shop',
  GACHA = 'gacha',
  SETTINGS = 'settings',
  LOADING = 'loading',
  CUTSCENE = 'cutscene',
  DIALOG = 'dialog',
  UNKNOWN = 'unknown',
}
export interface GameState {
  scene: GameScene
  isLoading: boolean
  timestamp: number
  confidence: number
  characterLevel?: number
  currentRegion?: string
  inventoryOpen?: boolean
  battleActive?: boolean
  menuOpen?: boolean
  dialogActive?: boolean
  networkLatency?: number
  connectionStable?: boolean
}
export interface StateTransition {
  from: GameScene
  to: GameScene
  timestamp: number
  confidence: number
}
/**
 * 游戏状态管理器类
 *
 * 功能包括：
 * - 游戏场景识别和状态追踪
 * - 状态变化监听和事件通知
 * - 状态历史记录
 * - 异步状态等待
 */
export declare class GameStateManager extends EventEmitter {
  private currentState
  private stateHistory
  private transitionHistory
  private maxHistoryLength
  private stateCheckInterval
  constructor()
  /**
   * 获取初始状态
   */
  private getInitialState
  /**
   * 更新游戏状态
   * @param newState 新的游戏状态
   */
  updateState(newState: Partial<GameState>): Promise<GameState>
  /**
   * 获取当前状态
   */
  getCurrentState(): GameState
  /**
   * 获取当前场景
   */
  getCurrentScene(): GameScene
  /**
   * 检查是否处于指定场景
   */
  isInScene(scene: GameScene): boolean
  /**
   * 检查是否处于任一指定场景
   */
  isInAnyScene(scenes: GameScene[]): boolean
  /**
   * 等待进入指定场景
   * @param targetScene 目标场景
   * @param timeout 超时时间 (毫秒)
   * @returns 是否成功进入目标场景
   */
  waitForScene(targetScene: GameScene, timeout?: number): Promise<boolean>
  /**
   * 等待离开指定场景
   * @param currentScene 当前场景
   * @param timeout 超时时间 (毫秒)
   */
  waitForSceneExit(currentScene: GameScene, timeout?: number): Promise<boolean>
  /**
   * 等待加载完成
   * @param timeout 超时时间
   */
  waitForLoadingComplete(timeout?: number): Promise<boolean>
  /**
   * 获取状态历史
   */
  getStateHistory(): GameState[]
  /**
   * 获取转换历史
   */
  getTransitionHistory(): StateTransition[]
  /**
   * 获取最近的状态转换
   */
  getLastTransition(): StateTransition | null
  /**
   * 检查状态是否稳定 (一段时间内没有变化)
   * @param duration 持续时间 (毫秒)
   */
  isStateStable(duration?: number): boolean
  /**
   * 强制设置场景 (用于调试或特殊情况)
   */
  forceSetScene(scene: GameScene, confidence?: number): Promise<void>
  /**
   * 标记为加载状态
   */
  setLoading(loading?: boolean): Promise<void>
  /**
   * 更新网络状态
   */
  updateNetworkStatus(latency: number, stable?: boolean): Promise<void>
  /**
   * 添加状态到历史记录
   */
  private addToHistory
  /**
   * 添加转换到历史记录
   */
  private addTransitionToHistory
  /**
   * 启动状态监控 (定期检查)
   */
  startMonitoring(interval?: number): void
  /**
   * 停止状态监控
   */
  stopMonitoring(): void
  /**
   * 清理资源
   */
  dispose(): void
  /**
   * 获取状态统计信息
   */
  getStatistics(): {
    totalTransitions: number
    averageSceneDuration: number
    mostFrequentScene: GameScene
    stateStability: number
  }
}
// # sourceMappingURL=GameStateManager.d.ts.map
