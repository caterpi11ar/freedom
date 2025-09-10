# Freedom 扩展开发教程

本教程将手把手教您如何开发 Freedom CLI 扩展，从简单的 Hello World 扩展到复杂的游戏自动化扩展。

## 🎯 学习目标

完成本教程后，您将能够：
- 创建和配置扩展项目
- 理解扩展生命周期
- 使用 Freedom Extension API
- 开发自定义命令和功能
- 发布和分享扩展

## 📚 前置知识

- TypeScript 基础语法
- Node.js 开发经验
- 了解 Freedom CLI 基础使用

## 🚀 教程 1: Hello World 扩展

### 步骤 1: 创建扩展

```bash
# 启动 Freedom CLI
pnpm dev

# 使用脚手架创建扩展
freedom> /extension create hello-world --typescript
```

这将创建以下目录结构：
```
extensions/hello-world/
├── package.json
├── tsconfig.json  
├── src/
│   └── index.ts
└── README.md
```

### 步骤 2: 编写扩展代码

编辑 `extensions/hello-world/src/index.ts`:

```typescript
import type { ExtensionContext } from '@freedom/shared'

/**
 * Hello World 扩展
 * 演示扩展的基本生命周期和 API 使用
 */
export class HelloWorldExtension {
  private context: ExtensionContext

  constructor(context: ExtensionContext) {
    this.context = context
  }

  async onEnable(): Promise<void> {
    this.context.logger.info('🌍 Hello World extension enabled!')
    
    // 注册自定义命令
    if (this.context.api.registerCommand) {
      this.context.api.registerCommand('hello:greet', this.greetUser.bind(this))
      this.context.api.registerCommand('hello:config', this.showConfig.bind(this))
    }

    // 监听游戏状态变化
    if (this.context.api.registerHook) {
      this.context.api.registerHook('game:status:changed', this.onGameStatusChanged.bind(this))
    }
  }

  async onDisable(): Promise<void> {
    this.context.logger.info('👋 Hello World extension disabled!')
  }

  async onUnload(): Promise<void> {
    this.context.logger.info('🗑️ Hello World extension unloaded!')
  }

  private async greetUser(): Promise<void> {
    const username = this.context.config.user?.name || 'Anonymous'
    this.context.logger.info(`👋 Hello, ${username}! Welcome to Freedom!`)
  }

  private async showConfig(): Promise<void> {
    this.context.logger.info('📋 Current configuration:')
    console.log(JSON.stringify(this.context.config, null, 2))
  }

  private async onGameStatusChanged(data: any): Promise<void> {
    this.context.logger.info(`🎮 Game status changed: ${data.status}`)
  }
}

// 扩展入口点
let extensionInstance: HelloWorldExtension | null = null

export async function onEnable(context: ExtensionContext): Promise<void> {
  extensionInstance = new HelloWorldExtension(context)
  await extensionInstance.onEnable()
}

export async function onDisable(context: ExtensionContext): Promise<void> {
  if (extensionInstance) {
    await extensionInstance.onDisable()
  }
}

export async function onUnload(context: ExtensionContext): Promise<void> {
  if (extensionInstance) {
    await extensionInstance.onUnload()
    extensionInstance = null
  }
}
```

### 步骤 3: 配置扩展清单

编辑 `extensions/hello-world/package.json`:

```json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "A simple Hello World extension for Freedom CLI",
  "main": "dist/index.js",
  "author": "Your Name",
  "license": "MIT",
  "keywords": ["freedom", "extension", "hello-world"],
  "freedomVersion": "^0.1.0",
  "permissions": [
    "config.read",
    "logger.write"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@freedom/shared": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

### 步骤 4: 构建和测试

```bash
# 进入扩展目录
cd extensions/hello-world

# 构建扩展
npm run build

# 返回主目录
cd ../..

# 在 Freedom CLI 中安装扩展
freedom> /extension install ./extensions/hello-world

# 启用扩展
freedom> /extension enable hello-world

# 测试扩展命令
freedom> hello:greet
freedom> hello:config
```

## 🎮 教程 2: 游戏状态监控扩展

现在让我们开发一个更实用的扩展 - 游戏状态监控器。

### 步骤 1: 创建扩展

```bash
freedom> /extension create game-monitor --typescript --template advanced
```

### 步骤 2: 实现监控功能

编辑 `extensions/game-monitor/src/index.ts`:

```typescript
import type { ExtensionContext } from '@freedom/shared'

interface GameStats {
  sessionStart: Date
  totalUptime: number
  reconnections: number
  lastActivity: Date
  status: 'connected' | 'disconnected' | 'reconnecting'
}

interface MonitorConfig {
  enabled: boolean
  checkInterval: number // 毫秒
  alertThreshold: number // 秒
  logLevel: 'info' | 'warn' | 'error'
}

export class GameMonitorExtension {
  private context: ExtensionContext
  private stats: GameStats
  private config: MonitorConfig
  private monitorTimer?: NodeJS.Timer
  
  constructor(context: ExtensionContext) {
    this.context = context
    this.stats = {
      sessionStart: new Date(),
      totalUptime: 0,
      reconnections: 0,
      lastActivity: new Date(),
      status: 'disconnected'
    }
    
    // 从配置中读取设置
    this.config = {
      enabled: context.config.extensions?.gameMonitor?.enabled ?? true,
      checkInterval: context.config.extensions?.gameMonitor?.checkInterval ?? 30000,
      alertThreshold: context.config.extensions?.gameMonitor?.alertThreshold ?? 300,
      logLevel: context.config.extensions?.gameMonitor?.logLevel ?? 'info'
    }
  }

  async onEnable(): Promise<void> {
    this.context.logger.info('📊 Game Monitor extension enabled')
    
    // 注册命令
    if (this.context.api.registerCommand) {
      this.context.api.registerCommand('monitor:stats', this.showStats.bind(this))
      this.context.api.registerCommand('monitor:reset', this.resetStats.bind(this))
      this.context.api.registerCommand('monitor:config', this.configureMonitor.bind(this))
    }
    
    // 注册游戏事件钩子
    if (this.context.api.registerHook) {
      this.context.api.registerHook('game:connected', this.onGameConnected.bind(this))
      this.context.api.registerHook('game:disconnected', this.onGameDisconnected.bind(this))
      this.context.api.registerHook('game:activity', this.onGameActivity.bind(this))
    }
    
    // 启动监控
    if (this.config.enabled) {
      this.startMonitoring()
    }
  }

  async onDisable(): Promise<void> {
    this.context.logger.info('📊 Game Monitor extension disabled')
    this.stopMonitoring()
  }

  async onUnload(): Promise<void> {
    this.context.logger.info('📊 Game Monitor extension unloaded')
    this.stopMonitoring()
  }

  private startMonitoring(): void {
    this.context.logger.info('🔍 Starting game monitoring...')
    
    this.monitorTimer = setInterval(() => {
      this.checkGameStatus()
    }, this.config.checkInterval)
  }

  private stopMonitoring(): void {
    if (this.monitorTimer) {
      clearInterval(this.monitorTimer)
      this.monitorTimer = undefined
      this.context.logger.info('⏹️ Game monitoring stopped')
    }
  }

  private async checkGameStatus(): Promise<void> {
    const now = new Date()
    const timeSinceActivity = now.getTime() - this.stats.lastActivity.getTime()
    
    // 检查是否需要发出警告
    if (timeSinceActivity > this.config.alertThreshold * 1000) {
      this.context.logger.warn(`⚠️ No game activity for ${Math.round(timeSinceActivity / 1000)} seconds`)
    }
    
    // 更新统计信息
    if (this.stats.status === 'connected') {
      this.stats.totalUptime += this.config.checkInterval
    }
    
    // 记录状态（如果配置为详细日志）
    if (this.config.logLevel === 'info') {
      this.context.logger.info(`📊 Status: ${this.stats.status}, Uptime: ${this.formatDuration(this.stats.totalUptime)}`)
    }
  }

  private async onGameConnected(data: any): Promise<void> {
    this.stats.status = 'connected'
    this.stats.lastActivity = new Date()
    this.context.logger.info('🎮 Game connected - monitoring started')
  }

  private async onGameDisconnected(data: any): Promise<void> {
    this.stats.status = 'disconnected'
    this.context.logger.warn('🔌 Game disconnected - monitoring paused')
    
    // 如果是意外断开，增加重连计数
    if (data?.reason !== 'user_initiated') {
      this.stats.reconnections++
    }
  }

  private async onGameActivity(data: any): Promise<void> {
    this.stats.lastActivity = new Date()
    
    if (this.config.logLevel === 'info') {
      this.context.logger.info(`🎯 Game activity: ${data?.type || 'unknown'}`)
    }
  }

  private async showStats(): Promise<void> {
    const now = new Date()
    const sessionDuration = now.getTime() - this.stats.sessionStart.getTime()
    
    console.log('\n📊 Game Monitor Statistics:')
    console.log(`   Status: ${this.stats.status}`)
    console.log(`   Session Duration: ${this.formatDuration(sessionDuration)}`)
    console.log(`   Total Uptime: ${this.formatDuration(this.stats.totalUptime)}`)
    console.log(`   Reconnections: ${this.stats.reconnections}`)
    console.log(`   Last Activity: ${this.stats.lastActivity.toLocaleString()}`)
    console.log(`   Uptime Ratio: ${((this.stats.totalUptime / sessionDuration) * 100).toFixed(1)}%`)
  }

  private async resetStats(): Promise<void> {
    this.stats = {
      sessionStart: new Date(),
      totalUptime: 0,
      reconnections: 0,
      lastActivity: new Date(),
      status: this.stats.status // 保持当前状态
    }
    
    this.context.logger.info('🔄 Game monitor statistics reset')
  }

  private async configureMonitor(): Promise<void> {
    console.log('\n⚙️ Game Monitor Configuration:')
    console.log(`   Enabled: ${this.config.enabled}`)
    console.log(`   Check Interval: ${this.config.checkInterval}ms`)
    console.log(`   Alert Threshold: ${this.config.alertThreshold}s`)
    console.log(`   Log Level: ${this.config.logLevel}`)
    console.log('\n💡 Use "/config set extensions.gameMonitor.<option> <value>" to modify')
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }
}

// 扩展入口点
let extensionInstance: GameMonitorExtension | null = null

export async function onEnable(context: ExtensionContext): Promise<void> {
  extensionInstance = new GameMonitorExtension(context)
  await extensionInstance.onEnable()
}

export async function onDisable(context: ExtensionContext): Promise<void> {
  if (extensionInstance) {
    await extensionInstance.onDisable()
  }
}

export async function onUnload(context: ExtensionContext): Promise<void> {
  if (extensionInstance) {
    await extensionInstance.onUnload()
    extensionInstance = null
  }
}
```

### 步骤 3: 配置权限和依赖

编辑 `extensions/game-monitor/package.json`:

```json
{
  "name": "game-monitor",
  "version": "1.0.0",
  "description": "Real-time game session monitoring and statistics",
  "main": "dist/index.js",
  "author": "Your Name",
  "license": "MIT",
  "keywords": ["freedom", "extension", "monitor", "statistics"],
  "freedomVersion": "^0.1.0",
  "permissions": [
    "config.read",
    "logger.write",
    "game.status",
    "hooks.register"
  ],
  "configuration": {
    "gameMonitor": {
      "type": "object",
      "properties": {
        "enabled": {
          "type": "boolean",
          "default": true,
          "description": "Enable game monitoring"
        },
        "checkInterval": {
          "type": "number",
          "default": 30000,
          "description": "Monitor check interval in milliseconds"
        },
        "alertThreshold": {
          "type": "number", 
          "default": 300,
          "description": "Alert threshold in seconds for inactive sessions"
        },
        "logLevel": {
          "type": "string",
          "enum": ["info", "warn", "error"],
          "default": "info",
          "description": "Monitoring log level"
        }
      }
    }
  }
}
```

### 步骤 4: 测试监控扩展

```bash
# 构建扩展
cd extensions/game-monitor
npm run build
cd ../..

# 安装和启用
freedom> /extension install ./extensions/game-monitor
freedom> /extension enable game-monitor

# 配置监控
freedom> /config set extensions.gameMonitor.checkInterval 15000
freedom> /config set extensions.gameMonitor.logLevel warn

# 启动游戏进行测试
freedom> /game start

# 查看监控统计
freedom> monitor:stats

# 查看配置
freedom> monitor:config

# 重置统计
freedom> monitor:reset
```

## 🔧 教程 3: 任务自动化扩展

让我们创建一个更复杂的扩展，实现自动化任务调度。

### 步骤 1: 创建调度器扩展

```bash
freedom> /extension create task-scheduler --typescript
```

### 步骤 2: 实现调度功能

编辑 `extensions/task-scheduler/src/index.ts`:

```typescript
import type { ExtensionContext } from '@freedom/shared'

interface ScheduledTask {
  id: string
  name: string
  script: string
  schedule: string // cron 格式
  enabled: boolean
  lastRun?: Date
  nextRun?: Date
  runCount: number
  failCount: number
}

interface TaskResult {
  taskId: string
  success: boolean
  startTime: Date
  endTime: Date
  output?: string
  error?: string
}

export class TaskSchedulerExtension {
  private context: ExtensionContext
  private tasks: Map<string, ScheduledTask> = new Map()
  private schedulerTimer?: NodeJS.Timer
  private running = false

  constructor(context: ExtensionContext) {
    this.context = context
  }

  async onEnable(): Promise<void> {
    this.context.logger.info('⏰ Task Scheduler extension enabled')
    
    // 注册命令
    if (this.context.api.registerCommand) {
      this.context.api.registerCommand('scheduler:list', this.listTasks.bind(this))
      this.context.api.registerCommand('scheduler:add', this.addTask.bind(this))
      this.context.api.registerCommand('scheduler:remove', this.removeTask.bind(this))
      this.context.api.registerCommand('scheduler:enable', this.enableTask.bind(this))
      this.context.api.registerCommand('scheduler:disable', this.disableTask.bind(this))
      this.context.api.registerCommand('scheduler:start', this.startScheduler.bind(this))
      this.context.api.registerCommand('scheduler:stop', this.stopScheduler.bind(this))
      this.context.api.registerCommand('scheduler:status', this.showStatus.bind(this))
    }

    // 加载已保存的任务
    await this.loadTasks()
  }

  async onDisable(): Promise<void> {
    this.context.logger.info('⏰ Task Scheduler extension disabled')
    await this.stopScheduler()
  }

  async onUnload(): Promise<void> {
    this.context.logger.info('⏰ Task Scheduler extension unloaded')
    await this.stopScheduler()
    await this.saveTasks()
  }

  private async addTask(): Promise<void> {
    // 这里应该有交互式界面来收集任务信息
    // 为了示例，我们添加一个预定义任务
    const task: ScheduledTask = {
      id: `task_${Date.now()}`,
      name: 'Daily Resin Check',
      script: 'resin-check',
      schedule: '0 */4 * * *', // 每4小时执行一次
      enabled: true,
      runCount: 0,
      failCount: 0,
      nextRun: this.calculateNextRun('0 */4 * * *')
    }

    this.tasks.set(task.id, task)
    await this.saveTasks()
    
    this.context.logger.info(`✅ Task added: ${task.name} (${task.id})`)
  }

  private async removeTask(): Promise<void> {
    // 实际实现中应该有任务选择界面
    console.log('📋 Scheduled Tasks:')
    this.tasks.forEach((task, id) => {
      console.log(`   ${id}: ${task.name} (${task.enabled ? 'enabled' : 'disabled'})`)
    })
    
    this.context.logger.info('💡 Use task ID to remove: scheduler:remove <task-id>')
  }

  private async listTasks(): Promise<void> {
    if (this.tasks.size === 0) {
      console.log('📋 No scheduled tasks found')
      return
    }

    console.log('\n📋 Scheduled Tasks:')
    console.log('─'.repeat(80))
    
    this.tasks.forEach((task) => {
      const status = task.enabled ? '🟢 Enabled' : '🔴 Disabled'
      const nextRun = task.nextRun ? task.nextRun.toLocaleString() : 'Not scheduled'
      const lastRun = task.lastRun ? task.lastRun.toLocaleString() : 'Never'
      
      console.log(`📅 ${task.name} (${task.id})`)
      console.log(`   Status: ${status}`)
      console.log(`   Script: ${task.script}`)
      console.log(`   Schedule: ${task.schedule}`)
      console.log(`   Next Run: ${nextRun}`)
      console.log(`   Last Run: ${lastRun}`)
      console.log(`   Runs: ${task.runCount} (${task.failCount} failed)`)
      console.log('─'.repeat(40))
    })
  }

  private async startScheduler(): Promise<void> {
    if (this.running) {
      this.context.logger.warn('⚠️ Scheduler is already running')
      return
    }

    this.running = true
    this.context.logger.info('▶️ Task scheduler started')
    
    // 每分钟检查一次是否有任务需要执行
    this.schedulerTimer = setInterval(async () => {
      await this.checkAndRunTasks()
    }, 60000) // 60秒检查间隔
  }

  private async stopScheduler(): Promise<void> {
    if (!this.running) {
      return
    }

    this.running = false
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = undefined
    }
    
    this.context.logger.info('⏸️ Task scheduler stopped')
  }

  private async showStatus(): Promise<void> {
    const enabledTasks = Array.from(this.tasks.values()).filter(t => t.enabled).length
    const totalTasks = this.tasks.size
    
    console.log('\n⏰ Task Scheduler Status:')
    console.log(`   Running: ${this.running ? '🟢 Yes' : '🔴 No'}`)
    console.log(`   Total Tasks: ${totalTasks}`)
    console.log(`   Enabled Tasks: ${enabledTasks}`)
    console.log(`   Disabled Tasks: ${totalTasks - enabledTasks}`)
    
    if (this.running) {
      const nextTask = this.getNextTask()
      if (nextTask) {
        console.log(`   Next Task: ${nextTask.name} at ${nextTask.nextRun?.toLocaleString()}`)
      }
    }
  }

  private async checkAndRunTasks(): Promise<void> {
    const now = new Date()
    
    for (const [id, task] of this.tasks) {
      if (task.enabled && task.nextRun && now >= task.nextRun) {
        await this.runTask(task)
      }
    }
  }

  private async runTask(task: ScheduledTask): Promise<void> {
    this.context.logger.info(`🚀 Running scheduled task: ${task.name}`)
    
    const result: TaskResult = {
      taskId: task.id,
      success: false,
      startTime: new Date(),
      endTime: new Date()
    }

    try {
      // 这里应该调用脚本执行 API
      // 为了示例，我们模拟执行
      result.output = `Task ${task.name} executed successfully`
      result.success = true
      
      task.runCount++
      this.context.logger.info(`✅ Task completed: ${task.name}`)
    } catch (error) {
      result.success = false
      result.error = error instanceof Error ? error.message : 'Unknown error'
      task.failCount++
      
      this.context.logger.error(`❌ Task failed: ${task.name} - ${result.error}`)
    } finally {
      result.endTime = new Date()
      task.lastRun = result.startTime
      task.nextRun = this.calculateNextRun(task.schedule)
      
      await this.saveTasks()
    }
  }

  private calculateNextRun(schedule: string): Date {
    // 简单的 cron 解析实现
    // 实际项目中应该使用 node-cron 等库
    const now = new Date()
    const nextRun = new Date(now.getTime() + 4 * 60 * 60 * 1000) // 4小时后
    return nextRun
  }

  private getNextTask(): ScheduledTask | null {
    const enabledTasks = Array.from(this.tasks.values())
      .filter(t => t.enabled && t.nextRun)
      .sort((a, b) => (a.nextRun!.getTime() - b.nextRun!.getTime()))
    
    return enabledTasks[0] || null
  }

  private async enableTask(): Promise<void> {
    // 实际实现中应该有交互式选择
    this.context.logger.info('💡 Use: scheduler:enable <task-id>')
  }

  private async disableTask(): Promise<void> {
    // 实际实现中应该有交互式选择
    this.context.logger.info('💡 Use: scheduler:disable <task-id>')
  }

  private async loadTasks(): Promise<void> {
    try {
      // 从存储中加载任务
      // 这里应该使用 Freedom 的存储 API
      this.context.logger.info('📂 Loading scheduled tasks...')
    } catch (error) {
      this.context.logger.warn('⚠️ Could not load tasks from storage')
    }
  }

  private async saveTasks(): Promise<void> {
    try {
      // 保存任务到存储
      // 这里应该使用 Freedom 的存储 API
      this.context.logger.info('💾 Tasks saved to storage')
    } catch (error) {
      this.context.logger.error('❌ Failed to save tasks to storage')
    }
  }
}

// 扩展入口点
let extensionInstance: TaskSchedulerExtension | null = null

export async function onEnable(context: ExtensionContext): Promise<void> {
  extensionInstance = new TaskSchedulerExtension(context)
  await extensionInstance.onEnable()
}

export async function onDisable(context: ExtensionContext): Promise<void> {
  if (extensionInstance) {
    await extensionInstance.onDisable()
  }
}

export async function onUnload(context: ExtensionContext): Promise<void> {
  if (extensionInstance) {
    await extensionInstance.onUnload()
    extensionInstance = null
  }
}
```

## 📦 发布扩展

### 步骤 1: 准备发布

```bash
# 完善文档
echo "# Task Scheduler Extension

Automated task scheduling for Freedom CLI.

## Features
- Cron-style scheduling
- Task management
- Execution monitoring
- Failure handling

## Commands
- \`scheduler:add\` - Add new task
- \`scheduler:list\` - List all tasks
- \`scheduler:start\` - Start scheduler
- \`scheduler:stop\` - Stop scheduler

## Configuration
Set tasks through the scheduler commands.
" > extensions/task-scheduler/README.md

# 构建发布版本
cd extensions/task-scheduler
npm run build

# 验证扩展
cd ../..
freedom> /extension validate ./extensions/task-scheduler
```

### 步骤 2: 创建发布包

```bash
# 在扩展目录创建发布脚本
cd extensions/task-scheduler

# 打包扩展
npm pack

# 或创建 tar 包
tar -czf task-scheduler-1.0.0.tgz dist/ package.json README.md
```

## 🎓 高级主题

### 1. 使用存储 API

```typescript
// 扩展中使用数据存储
if (this.context.api.storage) {
  // 保存数据
  await this.context.api.storage.set('my-extension:config', config)
  
  // 读取数据
  const data = await this.context.api.storage.get('my-extension:data')
  
  // 删除数据
  await this.context.api.storage.delete('my-extension:temp')
}
```

### 2. 错误处理最佳实践

```typescript
try {
  await riskyOperation()
} catch (error) {
  this.context.logger.error('Operation failed', {
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  })
  
  // 不要让扩展崩溃
  return false
}
```

### 3. 性能优化

```typescript
// 避免阻塞主线程
async function heavyOperation() {
  return new Promise(resolve => {
    setImmediate(() => {
      // 执行重操作
      resolve(result)
    })
  })
}

// 使用防抖减少频繁调用
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}
```

## ✅ 总结

通过这些教程，您已经学会了：

1. **基础扩展开发** - 生命周期、API 使用
2. **实用扩展功能** - 监控、统计、自动化
3. **高级扩展特性** - 任务调度、数据存储
4. **发布和分享** - 打包、文档、验证

## 🚀 下一步

- 探索更多 Extension API
- 学习游戏控制接口
- 参与社区扩展开发
- 分享您的扩展作品

更多信息请参考 [开发者指南](../developer-guide.md) 和 [API 文档](../api-reference.md)。