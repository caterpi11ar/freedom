// 游戏状态管理器 - 用于跟踪和管理云游戏的状态变化
import { EventEmitter } from 'node:events'

export enum GameScene {
  // 登录相关
  LOGIN = 'login',
  CHARACTER_SELECT = 'character_select',
  SERVER_SELECT = 'server_select',

  // 主要游戏场景
  MAIN_MENU = 'main_menu',
  WORLD = 'world',
  BATTLE = 'battle',

  // UI界面
  INVENTORY = 'inventory',
  CHARACTER_PANEL = 'character_panel',
  ADVENTURE_HANDBOOK = 'adventure_handbook',
  SHOP = 'shop',
  GACHA = 'gacha',
  SETTINGS = 'settings',

  // 特殊状态
  LOADING = 'loading',
  CUTSCENE = 'cutscene',
  DIALOG = 'dialog',
  UNKNOWN = 'unknown',
}

export interface GameState {
  scene: GameScene
  isLoading: boolean
  timestamp: number
  confidence: number // 识别置信度 0-1

  // 游戏特定状态
  characterLevel?: number
  currentRegion?: string
  inventoryOpen?: boolean
  battleActive?: boolean

  // UI状态
  menuOpen?: boolean
  dialogActive?: boolean

  // 网络状态
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
export class GameStateManager extends EventEmitter {
  private currentState: GameState
  private stateHistory: GameState[] = []
  private transitionHistory: StateTransition[] = []
  private maxHistoryLength = 50
  private stateCheckInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.currentState = this.getInitialState()
  }

  /**
   * 获取初始状态
   */
  private getInitialState(): GameState {
    return {
      scene: GameScene.UNKNOWN,
      isLoading: false,
      timestamp: Date.now(),
      confidence: 0,
      connectionStable: true,
    }
  }

  /**
   * 更新游戏状态
   * @param newState 新的游戏状态
   */
  async updateState(newState: Partial<GameState>): Promise<GameState> {
    const previousState = { ...this.currentState }

    // 合并新状态
    this.currentState = {
      ...this.currentState,
      ...newState,
      timestamp: Date.now(),
    }

    // 添加到历史记录
    this.addToHistory(this.currentState)

    // 如果场景发生变化，记录转换
    if (previousState.scene !== this.currentState.scene) {
      const transition: StateTransition = {
        from: previousState.scene,
        to: this.currentState.scene,
        timestamp: this.currentState.timestamp,
        confidence: this.currentState.confidence,
      }

      this.addTransitionToHistory(transition)

      // 发出状态变化事件
      this.emit('stateChanged', this.currentState, previousState)
      this.emit(`scene:${this.currentState.scene}`, this.currentState)
      this.emit(`transition:${previousState.scene}:${this.currentState.scene}`, transition)
    }

    // 发出状态更新事件
    this.emit('stateUpdated', this.currentState, previousState)

    return this.currentState
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): GameState {
    return { ...this.currentState }
  }

  /**
   * 获取当前场景
   */
  getCurrentScene(): GameScene {
    return this.currentState.scene
  }

  /**
   * 检查是否处于指定场景
   */
  isInScene(scene: GameScene): boolean {
    return this.currentState.scene === scene
  }

  /**
   * 检查是否处于任一指定场景
   */
  isInAnyScene(scenes: GameScene[]): boolean {
    return scenes.includes(this.currentState.scene)
  }

  /**
   * 等待进入指定场景
   * @param targetScene 目标场景
   * @param timeout 超时时间 (毫秒)
   * @returns 是否成功进入目标场景
   */
  async waitForScene(targetScene: GameScene, timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      // 如果已经在目标场景，立即返回
      if (this.currentState.scene === targetScene) {
        resolve(true)
        return
      }

      let timer: NodeJS.Timeout | null = null

      const onStateChanged = (newState: GameState) => {
        if (newState.scene === targetScene) {
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
   * 等待离开指定场景
   * @param currentScene 当前场景
   * @param timeout 超时时间 (毫秒)
   */
  async waitForSceneExit(currentScene: GameScene, timeout: number = 30000): Promise<boolean> {
    return new Promise((resolve) => {
      // 如果已经不在当前场景，立即返回
      if (this.currentState.scene !== currentScene) {
        resolve(true)
        return
      }

      let timer: NodeJS.Timeout | null = null

      const onStateChanged = (newState: GameState) => {
        if (newState.scene !== currentScene) {
          if (timer)
            clearTimeout(timer)
          this.off('stateChanged', onStateChanged)
          resolve(true)
        }
      }

      this.on('stateChanged', onStateChanged)

      timer = setTimeout(() => {
        this.off('stateChanged', onStateChanged)
        resolve(false)
      }, timeout)
    })
  }

  /**
   * 等待加载完成
   * @param timeout 超时时间
   */
  async waitForLoadingComplete(timeout: number = 60000): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.currentState.isLoading) {
        resolve(true)
        return
      }

      let timer: NodeJS.Timeout | null = null

      const onStateUpdated = (newState: GameState) => {
        if (!newState.isLoading) {
          if (timer)
            clearTimeout(timer)
          this.off('stateUpdated', onStateUpdated)
          resolve(true)
        }
      }

      this.on('stateUpdated', onStateUpdated)

      timer = setTimeout(() => {
        this.off('stateUpdated', onStateUpdated)
        resolve(false)
      }, timeout)
    })
  }

  /**
   * 获取状态历史
   */
  getStateHistory(): GameState[] {
    return [...this.stateHistory]
  }

  /**
   * 获取转换历史
   */
  getTransitionHistory(): StateTransition[] {
    return [...this.transitionHistory]
  }

  /**
   * 获取最近的状态转换
   */
  getLastTransition(): StateTransition | null {
    return this.transitionHistory.length > 0
      ? this.transitionHistory[this.transitionHistory.length - 1]
      : null
  }

  /**
   * 检查状态是否稳定 (一段时间内没有变化)
   * @param duration 持续时间 (毫秒)
   */
  isStateStable(duration: number = 2000): boolean {
    const now = Date.now()
    const recentTransitions = this.transitionHistory.filter(
      t => now - t.timestamp < duration,
    )
    return recentTransitions.length === 0
  }

  /**
   * 强制设置场景 (用于调试或特殊情况)
   */
  async forceSetScene(scene: GameScene, confidence: number = 1.0): Promise<void> {
    await this.updateState({
      scene,
      confidence,
      isLoading: false,
    })
  }

  /**
   * 标记为加载状态
   */
  async setLoading(loading: boolean = true): Promise<void> {
    await this.updateState({ isLoading: loading })
  }

  /**
   * 更新网络状态
   */
  async updateNetworkStatus(latency: number, stable: boolean = true): Promise<void> {
    await this.updateState({
      networkLatency: latency,
      connectionStable: stable,
    })
  }

  /**
   * 添加状态到历史记录
   */
  private addToHistory(state: GameState): void {
    this.stateHistory.push({ ...state })

    // 保持历史记录长度
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory.shift()
    }
  }

  /**
   * 添加转换到历史记录
   */
  private addTransitionToHistory(transition: StateTransition): void {
    this.transitionHistory.push(transition)

    if (this.transitionHistory.length > this.maxHistoryLength) {
      this.transitionHistory.shift()
    }
  }

  /**
   * 启动状态监控 (定期检查)
   */
  startMonitoring(interval: number = 1000): void {
    if (this.stateCheckInterval) {
      this.stopMonitoring()
    }

    this.stateCheckInterval = setInterval(() => {
      this.emit('monitoring:tick', this.currentState)
    }, interval)
  }

  /**
   * 停止状态监控
   */
  stopMonitoring(): void {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval)
      this.stateCheckInterval = null
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.stopMonitoring()
    this.removeAllListeners()
    this.stateHistory = []
    this.transitionHistory = []
  }

  /**
   * 获取状态统计信息
   */
  getStatistics(): {
    totalTransitions: number
    averageSceneDuration: number
    mostFrequentScene: GameScene
    stateStability: number
  } {
    const totalTransitions = this.transitionHistory.length

    // 计算平均场景持续时间
    let totalDuration = 0
    for (let i = 1; i < this.stateHistory.length; i++) {
      totalDuration += this.stateHistory[i].timestamp - this.stateHistory[i - 1].timestamp
    }
    const averageSceneDuration = totalTransitions > 0 ? totalDuration / totalTransitions : 0

    // 找到最频繁的场景
    const sceneCounts = new Map<GameScene, number>()
    this.stateHistory.forEach((state) => {
      sceneCounts.set(state.scene, (sceneCounts.get(state.scene) || 0) + 1)
    })

    let mostFrequentScene = GameScene.UNKNOWN
    let maxCount = 0
    sceneCounts.forEach((count, scene) => {
      if (count > maxCount) {
        maxCount = count
        mostFrequentScene = scene
      }
    })

    // 计算状态稳定性 (基于置信度)
    const recentStates = this.stateHistory.slice(-10)
    const stateStability = recentStates.length > 0
      ? recentStates.reduce((sum, state) => sum + state.confidence, 0) / recentStates.length
      : 0

    return {
      totalTransitions,
      averageSceneDuration,
      mostFrequentScene,
      stateStability,
    }
  }
}
