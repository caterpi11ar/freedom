# Web端云游戏Canvas自动化架构 - 核心功能优先

## 📋 概述

**项目背景**: 基于Web端云游戏的自动化控制系统
**技术栈**: Playwright + Canvas交互
**目标游戏**: Web端云原神 (Canvas渲染)
**核心目标**: **优先实现登录游戏功能**

## 🎯 核心需求 (优先实现)

### 1. 登录游戏自动化 ⭐⭐⭐
**最高优先级功能**：
- 自动打开游戏页面
- 识别登录界面
- 输入用户名密码
- 点击登录按钮
- 处理验证码或二次验证
- 选择服务器
- 确认进入游戏

### 2. 基础Canvas交互 ⭐⭐⭐
**支持登录的必需功能**：
- Canvas元素定位
- 鼠标点击模拟
- 文本输入模拟
- 基础截图功能
- 简单的元素识别

### 3. 基础状态管理 ⭐⭐
**简化版状态管理**：
- 登录状态检测
- 加载状态识别
- 基础错误处理

## 🎯 核心挑战与解决方案

### 挑战1: Canvas元素交互
**问题**: Canvas是单一DOM元素，无法直接定位游戏内UI
**解决方案**: 
- 坐标系映射 (屏幕坐标 → Canvas坐标)
- 图像识别定位游戏元素
- 模拟真实用户操作

### 挑战2: 游戏状态检测
**问题**: 无法通过DOM结构获取游戏状态
**解决方案**:
- Canvas截图 + 图像比对
- 颜色采样 + 模式识别
- OCR文字识别

### 挑战3: 云游戏延迟处理
**问题**: 网络延迟和渲染延迟影响操作精度
**解决方案**:
- 智能等待机制
- 操作确认反馈
- 自适应延迟调整

## 🏗️ 简化架构设计 (专注登录功能)

### 1. 核心模块结构

```
packages/core/src/
├── canvas/                    # Canvas基础交互
│   ├── CanvasController.ts    # Canvas控制器 (已实现)
│   └── LoginInteractor.ts     # 登录专用交互器 ⭐
├── game/                      # 游戏登录逻辑
│   ├── LoginStateManager.ts   # 登录状态管理 ⭐
│   └── LoginAutomator.ts      # 登录自动化器 ⭐
└── types/                     # 类型定义
    └── LoginTypes.ts          # 登录相关类型 ⭐
```

### 2. 登录流程设计

```
登录自动化流程：
1. 打开游戏页面
2. 等待Canvas加载完成
3. 识别登录界面 (通过截图或颜色检测)
4. 定位用户名输入框 (固定坐标)
5. 输入用户名
6. 定位密码输入框 (固定坐标)
7. 输入密码  
8. 点击登录按钮 (固定坐标)
9. 等待登录结果
10. 处理服务器选择 (如需要)
11. 确认进入游戏
```

### 2. Canvas控制器设计

```typescript
// packages/core/src/canvas/CanvasController.ts
export interface CanvasInfo {
  element: ElementHandle<Element>
  bounds: BoundingBox
  scale: { x: number; y: number }
  offset: { x: number; y: number }
}

export interface GameCoordinate {
  x: number
  y: number
  relative?: boolean // 相对坐标还是绝对坐标
}

export class CanvasController {
  private page: Page
  private canvas: CanvasInfo | null = null
  
  constructor(page: Page) {
    this.page = page
  }
  
  // 初始化Canvas控制器
  async initialize(): Promise<void>
  
  // 获取Canvas信息
  async getCanvasInfo(): Promise<CanvasInfo>
  
  // 坐标转换：游戏坐标 → 屏幕坐标
  gameToScreen(coord: GameCoordinate): Promise<{ x: number; y: number }>
  
  // 点击Canvas指定位置
  async clickAt(coord: GameCoordinate, options?: ClickOptions): Promise<void>
  
  // 拖拽操作
  async dragTo(from: GameCoordinate, to: GameCoordinate): Promise<void>
  
  // 获取Canvas截图
  async screenshot(area?: GameCoordinate & { width: number; height: number }): Promise<Buffer>
  
  // 颜色采样
  async sampleColor(coord: GameCoordinate): Promise<{ r: number; g: number; b: number; a: number }>
}
```

### 3. 游戏状态管理设计

```typescript
// packages/core/src/game/GameStateManager.ts
export enum GameScene {
  LOGIN = 'login',
  MAIN_MENU = 'main_menu',
  CHARACTER_SELECT = 'character_select',
  WORLD = 'world',
  BATTLE = 'battle',
  INVENTORY = 'inventory',
  LOADING = 'loading',
  UNKNOWN = 'unknown'
}

export interface GameState {
  scene: GameScene
  isLoading: boolean
  characterLevel?: number
  currentRegion?: string
  inventoryOpen?: boolean
  battleActive?: boolean
  timestamp: number
  confidence: number // 识别置信度 0-1
}

export class GameStateManager {
  private currentState: GameState
  private stateHistory: GameState[] = []
  private recognizer: GameSceneRecognizer
  
  constructor(recognizer: GameSceneRecognizer) {
    this.recognizer = recognizer
    this.currentState = this.getInitialState()
  }
  
  // 更新游戏状态
  async updateState(screenshot: Buffer): Promise<GameState>
  
  // 获取当前状态
  getCurrentState(): GameState
  
  // 等待状态变化
  async waitForState(targetScene: GameScene, timeout?: number): Promise<boolean>
  
  // 状态变化监听
  onStateChange(callback: (newState: GameState, oldState: GameState) => void): void
}
```

### 4. 游戏元素检测设计

```typescript
// packages/core/src/game/GameElementDetector.ts
export interface GameElement {
  id: string
  name: string
  type: 'button' | 'icon' | 'text' | 'menu' | 'character' | 'item'
  position: GameCoordinate
  size: { width: number; height: number }
  confidence: number
  template?: string // 模板图片路径
  color?: { r: number; g: number; b: number } // 特征颜色
}

export class GameElementDetector {
  private templateLibrary: TemplateLibrary
  private imageMatcher: ImageMatcher
  
  constructor(templateLibrary: TemplateLibrary, imageMatcher: ImageMatcher) {
    this.templateLibrary = templateLibrary
    this.imageMatcher = imageMatcher
  }
  
  // 检测所有游戏元素
  async detectElements(screenshot: Buffer, scene: GameScene): Promise<GameElement[]>
  
  // 查找特定元素
  async findElement(screenshot: Buffer, elementId: string): Promise<GameElement | null>
  
  // 等待元素出现
  async waitForElement(elementId: string, timeout?: number): Promise<GameElement | null>
  
  // 批量检测特定类型元素
  async detectElementsByType(screenshot: Buffer, type: GameElement['type']): Promise<GameElement[]>
}
```

### 5. 自动化任务执行器

```typescript
// packages/core/src/automation/AutomationEngine.ts
export interface GameAction {
  type: 'click' | 'drag' | 'wait' | 'detect' | 'navigate'
  target?: string | GameCoordinate
  params?: any
  timeout?: number
  retries?: number
}

export interface AutomationTask {
  id: string
  name: string
  description: string
  actions: GameAction[]
  preconditions?: GameScene[]
  expectedResult?: GameScene
}

export class AutomationEngine {
  private canvasController: CanvasController
  private stateManager: GameStateManager
  private elementDetector: GameElementDetector
  private taskScheduler: TaskScheduler
  
  constructor(
    canvasController: CanvasController,
    stateManager: GameStateManager,
    elementDetector: GameElementDetector,
    taskScheduler: TaskScheduler
  ) {
    // ...
  }
  
  // 执行单个动作
  async executeAction(action: GameAction): Promise<void>
  
  // 执行任务
  async executeTask(task: AutomationTask): Promise<boolean>
  
  // 执行任务序列
  async executeTasks(tasks: AutomationTask[]): Promise<void>
  
  // 紧急停止
  async emergencyStop(): Promise<void>
}
```

## 🎮 游戏特定实现

### 原神云游戏特化

```typescript
// packages/core/src/game/genshin/GenshinGameController.ts
export class GenshinGameController extends AutomationEngine {
  // 原神特定的坐标和元素定义
  private static readonly ELEMENTS = {
    // 主界面元素
    ADVENTURE_HANDBOOK: { x: 1200, y: 100 },
    CHARACTER_PANEL: { x: 50, y: 200 },
    INVENTORY: { x: 1150, y: 200 },
    
    // 战斗相关
    SKILL_BUTTON: { x: 1400, y: 600 },
    ULTIMATE_BUTTON: { x: 1450, y: 550 },
    
    // 菜单按钮
    ESC_MENU: { x: 100, y: 50 },
    SETTINGS: { x: 1450, y: 50 }
  }
  
  // 登录流程
  async login(username?: string, password?: string): Promise<boolean>
  
  // 每日任务
  async completeDailyTasks(): Promise<void>
  
  // 自动战斗
  async autoBattle(duration: number): Promise<void>
  
  // 收集资源
  async collectResources(): Promise<void>
  
  // 角色切换
  async switchCharacter(characterIndex: number): Promise<void>
}
```

## 🧪 测试架构

### Canvas测试工具

```typescript
// packages/test-utils/src/mocks/CanvasMockEnvironment.ts
export class CanvasMockEnvironment {
  private mockCanvas: HTMLCanvasElement
  private mockContext: CanvasRenderingContext2D
  
  constructor(width: number = 1920, height: number = 1080) {
    this.setupMockCanvas(width, height)
  }
  
  // 模拟Canvas环境
  setupMockCanvas(width: number, height: number): void
  
  // 模拟游戏场景渲染
  renderMockScene(scene: GameScene): void
  
  // 模拟点击热区
  addClickableArea(area: GameElement): void
  
  // 获取模拟截图
  getMockScreenshot(): Buffer
  
  // 模拟状态变化
  simulateStateChange(newScene: GameScene): void
}
```

## 📈 性能优化策略

### 1. 图像识别优化
- **ROI (Region of Interest)**: 只检测感兴趣区域
- **多层级检测**: 粗检测 → 精细检测
- **缓存机制**: 模板匹配结果缓存
- **并行处理**: 多元素并行检测

### 2. 网络延迟处理
- **自适应等待**: 根据网络延迟动态调整等待时间
- **操作确认**: 每次操作后验证结果
- **失败重试**: 智能重试机制

### 3. 内存管理
- **截图缓存池**: 复用Buffer对象
- **图像压缩**: 适当压缩截图降低内存占用
- **定期清理**: 清理过期的识别结果

## 🔧 配置系统

### Canvas游戏配置

```typescript
// 添加到现有配置schema
export interface CanvasGameConfig {
  // Canvas选择器
  canvasSelector: string
  
  // 游戏窗口尺寸
  gameResolution: {
    width: number
    height: number
    scale?: number
  }
  
  // 识别参数
  recognition: {
    screenshotInterval: number // 截图间隔
    matchThreshold: number     // 匹配阈值
    colorTolerance: number     // 颜色容忍度
    ocrLanguage: string        // OCR语言
  }
  
  // 操作参数
  interaction: {
    clickDelay: number         // 点击延迟
    dragSpeed: number          // 拖拽速度
    doubleClickInterval: number // 双击间隔
  }
  
  // 网络相关
  network: {
    latencyCompensation: boolean // 延迟补偿
    adaptiveDelay: boolean       // 自适应延迟
    maxRetries: number           // 最大重试次数
  }
}
```

## 🚀 实施计划

### Phase 1: 核心基础设施 (3-4天)
1. CanvasController 基础实现
2. 坐标映射和截图功能
3. 基础图像识别框架
4. 测试工具和Mock环境

### Phase 2: 游戏状态管理 (2-3天)
1. GameStateManager 实现
2. 场景识别系统
3. 状态变化监听
4. 元素检测基础功能

### Phase 3: 自动化引擎 (3-4天)
1. AutomationEngine 核心实现
2. 任务调度和执行
3. 错误恢复机制
4. 性能监控

### Phase 4: 原神特化 (2-3天)
1. 原神特定元素和场景
2. 常用操作封装
3. 任务脚本模板
4. 完整测试覆盖

**总预计时间**: 10-14天