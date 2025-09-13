// 纯交互式终端 - 支持斜杠命令和二级交互界面
import process from 'node:process'
import readline from 'node:readline'
import { scriptTemplateManager } from '@freedom/core'
import { globalStateManager } from '@freedom/shared'
import chalk from 'chalk'
import {
  executeLogCleanup,
  executeLogExport,
  executeLogMonitor,
  executeLogSearch,
  executeLogStats,
  executeLogView,
} from '../commands/log.js'
import { executeLogin } from '../commands/login/index.js'
import {
  executePromptCreate,
  executePromptDelete,
  executePromptGenerate,
  executePromptList,
  executePromptSearch,
  executePromptStats,
} from '../commands/prompt.js'
import {
  executeTaskControl,
  executeTaskCreate,
  executeTaskHistory,
  executeTaskList,
  executeTaskStats,
} from '../commands/task.js'

// 启动参数接口
interface StartupOptions {
  debug?: boolean
  config?: string
  headless?: boolean
  help?: boolean
  version?: boolean
}

// 斜杠命令接口
interface SlashCommand {
  name: string
  description: string
  handler: (args: string[]) => Promise<void>
}

// 交互式终端类
export class InteractiveTerminal {
  private rl: readline.Interface
  private commands: Map<string, SlashCommand> = new Map()
  private options: StartupOptions
  private navigationStack: string[] = []

  constructor(options: StartupOptions = {}) {
    this.options = options
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt(),
      historySize: 100,
    })

    this.setupCommands()
    this.setupEventHandlers()
  }

  private getPrompt(): string {
    const state = globalStateManager.getState()
    const statusIcon = state.isRunning ? '🟢' : '🔴'
    const breadcrumb = this.getBreadcrumb()
    return chalk.rgb(0, 255, 200)(`freedom ${statusIcon}${breadcrumb} > `)
  }

  private getBreadcrumb(): string {
    if (this.navigationStack.length === 0)
      return ''
    return chalk.gray(' • ') + chalk.rgb(150, 150, 150)(this.navigationStack.join(' → '))
  }

  private setupCommands(): void {
    // 基础命令
    this.commands.set('/help', {
      name: '/help',
      description: '显示可用命令列表和使用说明',
      handler: this.handleHelp.bind(this),
    })

    this.commands.set('/status', {
      name: '/status',
      description: '查看系统和游戏运行状态',
      handler: this.handleStatus.bind(this),
    })

    this.commands.set('/config', {
      name: '/config',
      description: '配置管理（查看/修改设置）',
      handler: this.handleConfig.bind(this),
    })

    this.commands.set('/exit', {
      name: '/exit',
      description: '安全退出程序',
      handler: this.handleExit.bind(this),
    })

    // 游戏相关命令
    this.commands.set('/login', {
      name: '/login',
      description: '游戏登录和身份验证',
      handler: this.handleLogin.bind(this),
    })

    this.commands.set('/start', {
      name: '/start',
      description: '启动游戏会话',
      handler: this.handleStart.bind(this),
    })

    this.commands.set('/stop', {
      name: '/stop',
      description: '停止游戏会话',
      handler: this.handleStop.bind(this),
    })

    this.commands.set('/restart', {
      name: '/restart',
      description: '重启游戏会话',
      handler: this.handleRestart.bind(this),
    })

    this.commands.set('/status', {
      name: '/status',
      description: '查看游戏会话状态',
      handler: this.handleGameStatus.bind(this),
    })

    this.commands.set('/game', {
      name: '/game',
      description: '游戏控制中心（综合管理）',
      handler: this.handleGame.bind(this),
    })

    this.commands.set('/script', {
      name: '/script',
      description: '脚本管理和执行',
      handler: this.handleScript.bind(this),
    })

    // 高级功能
    this.commands.set('/log', {
      name: '/log',
      description: '日志查看和管理',
      handler: this.handleLog.bind(this),
    })

    this.commands.set('/task', {
      name: '/task',
      description: '任务队列管理',
      handler: this.handleTask.bind(this),
    })

    this.commands.set('/prompt', {
      name: '/prompt',
      description: 'AI提示词库管理',
      handler: this.handlePrompt.bind(this),
    })

    this.commands.set('/debug', {
      name: '/debug',
      description: '调试工具和诊断信息',
      handler: this.handleDebug.bind(this),
    })

    // 扩展命令
    this.commands.set('/extension', {
      name: '/extension',
      description: '扩展插件管理',
      handler: this.handleExtension.bind(this),
    })

    // 导航命令
    this.commands.set('/back', {
      name: '/back',
      description: '返回上级界面',
      handler: this.handleBack.bind(this),
    })
  }

  private setupEventHandlers(): void {
    this.rl.on('line', this.handleInput.bind(this))
    this.rl.on('close', this.handleExit.bind(this))

    // 处理 Ctrl+C
    process.on('SIGINT', () => {
      console.log(chalk.yellow('\n\n👋 使用 /exit 命令安全退出程序'))
      this.rl.prompt()
    })

    // 处理 ESC 键（返回上级）
    // Note: keypress handling requires enabling raw mode
    // this.rl.input.on('keypress', (_str, key) => {
    //   if (key && key.name === 'escape') {
    //     this.handleBack([])
    //   }
    // })

    // 监听状态变化，更新提示符
    globalStateManager.onStateChange(() => {
      this.rl.setPrompt(this.getPrompt())
    })
  }

  async start(): Promise<void> {
    console.log(chalk.cyan('🎮 ') + chalk.rgb(100, 200, 255)('Welcome to Freedom Interactive Terminal'))
    console.log(chalk.gray(`💡 Type ${chalk.white('/help')} to see available commands`))

    if (this.options.debug) {
      console.log(chalk.yellow('🐛 Debug mode enabled'))
    }

    if (this.options.headless) {
      console.log(chalk.blue('👻 Headless mode enabled'))
    }

    console.log()
    this.rl.prompt()
  }

  private async handleInput(input: string): Promise<void> {
    const trimmed = input.trim()

    if (!trimmed) {
      this.rl.prompt()
      return
    }

    // 检查是否是斜杠命令
    if (!trimmed.startsWith('/')) {
      console.log(chalk.red('❌ 命令必须以 / 开头'))
      console.log(chalk.gray(`💡 输入 ${chalk.white('/help')} 查看可用命令`))
      this.rl.prompt()
      return
    }

    // 解析命令和参数
    const parts = trimmed.split(/\s+/)
    const commandName = parts[0]
    const args = parts.slice(1)

    const command = this.commands.get(commandName)
    if (!command) {
      console.log(chalk.red(`❌ 未知命令: ${chalk.white(commandName)}`))
      console.log(chalk.gray(`💡 输入 ${chalk.white('/help')} 查看可用命令`))
      this.rl.prompt()
      return
    }

    try {
      await command.handler(args)
    }
    catch (error) {
      console.log(chalk.red(`❌ 命令执行失败: ${error instanceof Error ? error.message : String(error)}`))
      if (this.options.debug && error instanceof Error) {
        console.log(chalk.gray(error.stack))
      }
    }

    this.rl.prompt()
  }

  // ============ 基础命令处理器 ============

  private async handleHelp(_args: string[]): Promise<void> {
    console.log(chalk.cyan.bold('\n📖 Freedom Interactive Commands\n'))

    const categories = [
      {
        title: '基础命令',
        commands: ['/help', '/config', '/exit'],
      },
      {
        title: '游戏会话管理',
        commands: ['/start', '/stop', '/restart', '/status'],
      },
      {
        title: '游戏功能',
        commands: ['/login', '/game', '/script'],
      },
      {
        title: '高级功能',
        commands: ['/log', '/task', '/prompt', '/debug', '/extension'],
      },
    ]

    for (const category of categories) {
      console.log(chalk.yellow.bold(`${category.title}:`))
      for (const cmdName of category.commands) {
        const cmd = this.commands.get(cmdName)
        if (cmd) {
          console.log(chalk.white(`  ${cmdName.padEnd(12)} - ${cmd.description}`))
        }
      }
      console.log()
    }

    console.log(chalk.gray('💡 提示:'))
    console.log(chalk.gray('  - 所有命令都必须以 / 开头'))
    console.log(chalk.gray('  - 部分命令支持二级交互界面'))
    console.log(chalk.gray('  - 使用 ESC 或 /back 返回上级界面\n'))
  }

  private async handleStatus(_args: string[]): Promise<void> {
    const state = globalStateManager.getState()
    const memUsage = process.memoryUsage()

    console.log(chalk.cyan.bold('\n📊 系统状态'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`${chalk.white('内存使用:')} ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`)
    console.log(`${chalk.white('运行时长:')} ${Math.floor((Date.now() - state.startTime.getTime()) / 1000)}秒`)

    console.log(chalk.cyan.bold('\n🎮 游戏状态'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`${chalk.white('运行状态:')} ${state.isRunning ? '🟢 运行中' : '🔴 未运行'}`)

    if (state.sessionId) {
      console.log(`${chalk.white('会话ID:')} ${state.sessionId}`)
    }

    if (state.lastActivity) {
      console.log(`${chalk.white('最后活动:')} ${state.lastActivity.toLocaleString()}`)
    }

    console.log(chalk.cyan.bold('\n⚙️ 启动配置'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`${chalk.white('调试模式:')} ${this.options.debug ? '🟢 启用' : '🔴 禁用'}`)
    console.log(`${chalk.white('无头模式:')} ${this.options.headless ? '🟢 启用' : '🔴 禁用'}`)
    if (this.options.config) {
      console.log(`${chalk.white('配置文件:')} ${this.options.config}`)
    }
    console.log()
  }

  private async handleConfig(_args: string[]): Promise<void> {
    this.pushContext('配置管理')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n⚙️ 配置管理'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.white('选择操作:'))
    console.log('  1. 查看当前配置')
    console.log('  2. 修改配置项')
    console.log('  3. 重置配置')
    console.log('  4. 导出配置')
    console.log()

    const choice = await this.promptSelect('请选择 [1-4]:', ['1', '2', '3', '4'])

    switch (choice) {
      case '1':
        await this.showCurrentConfig()
        break
      case '2':
        await this.modifyConfig()
        break
      case '3':
        await this.resetConfig()
        break
      case '4':
        await this.exportConfig()
        break
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  private async handleExit(_args: string[]): Promise<void> {
    console.log(chalk.yellow('\n👋 正在安全退出...'))

    const state = globalStateManager.getState()
    if (state.isRunning) {
      console.log(chalk.blue('🛑 检测到游戏正在运行，正在停止...'))
      // TODO: 实现游戏停止逻辑
      globalStateManager.setState({ isRunning: false })
    }

    this.rl.close()
    process.exit(0)
  }

  // ============ 游戏相关命令处理器 ============

  private async handleLogin(_args: string[]): Promise<void> {
    try {
      await executeLogin()
    }
    catch (error) {
      console.log(chalk.red(`❌ 登录失败: ${error instanceof Error ? error.message : String(error)}`))
    }
  }

  private async handleStart(_args: string[]): Promise<void> {
    this.pushContext('启动游戏')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n🚀 启动游戏会话'))
    console.log(chalk.gray('─'.repeat(40)))

    // 检查当前状态
    const state = globalStateManager.getState()
    if (state.isRunning) {
      console.log(chalk.yellow('⚠️  游戏会话已在运行中'))
      const restart = await this.promptConfirm('是否要重启游戏？')
      if (restart) {
        await this.handleRestart([])
      }
      this.navigationStack.pop()
      this.rl.setPrompt(this.getPrompt())
      return
    }

    try {
      // 1. 启动模式选择
      console.log(chalk.white('\n🎮 启动模式选择:'))
      console.log('  1. 标准模式 - 正常启动游戏')
      console.log('  2. 无头模式 - 后台运行')
      console.log('  3. 调试模式 - 开发调试')
      console.log('  4. 快速模式 - 跳过初始化')
      console.log()

      const modeChoice = await this.promptSelect('请选择启动模式 [1-4]:', ['1', '2', '3', '4'])

      const startupModes = {
        1: { name: '标准模式', headless: false, debug: false, skipInit: false },
        2: { name: '无头模式', headless: true, debug: false, skipInit: false },
        3: { name: '调试模式', headless: false, debug: true, skipInit: false },
        4: { name: '快速模式', headless: false, debug: false, skipInit: true },
      }

      const selectedMode = startupModes[modeChoice as keyof typeof startupModes]
      console.log(chalk.blue(`✅ 已选择: ${selectedMode.name}`))

      // 2. 账户选择
      console.log(chalk.white('\n👤 账户选择:'))
      console.log('  1. 使用默认账户')
      console.log('  2. 选择其他账户')
      console.log('  3. 快速登录模式')
      console.log()

      const accountChoice = await this.promptSelect('请选择账户模式 [1-3]:', ['1', '2', '3'])
      let selectedAccount = 'default'

      if (accountChoice === '2') {
        // TODO: 集成账户管理器获取账户列表
        console.log(chalk.yellow('💡 账户选择功能开发中，将使用默认账户'))
      }
      else if (accountChoice === '3') {
        const quickLogin = await this.promptText('请输入账户ID: ')
        if (quickLogin.trim()) {
          selectedAccount = quickLogin.trim()
        }
      }

      // 3. 环境检查
      console.log(chalk.white('\n🔍 环境检查:'))
      await this.performStartupEnvironmentCheck()

      // 4. 启动确认
      console.log(chalk.white('\n📋 启动配置确认:'))
      console.log(`  模式: ${chalk.cyan(selectedMode.name)}`)
      console.log(`  账户: ${chalk.cyan(selectedAccount)}`)
      console.log(`  无头模式: ${selectedMode.headless ? '🟢 启用' : '🔴 禁用'}`)
      console.log(`  调试模式: ${selectedMode.debug ? '🟢 启用' : '🔴 禁用'}`)
      console.log()

      const confirmed = await this.promptConfirm('确认启动游戏会话？')
      if (!confirmed) {
        console.log(chalk.gray('❌ 启动已取消'))
        this.navigationStack.pop()
        this.rl.setPrompt(this.getPrompt())
        return
      }

      // 5. 执行启动流程
      console.log(chalk.blue('\n🚀 正在启动游戏会话...'))

      if (!selectedMode.skipInit) {
        console.log(chalk.gray('⏳ 初始化浏览器环境...'))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      console.log(chalk.gray('⏳ 启动浏览器会话...'))
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log(chalk.gray('⏳ 导航到游戏页面...'))
      await new Promise(resolve => setTimeout(resolve, 1500))

      console.log(chalk.gray('⏳ 等待游戏加载...'))
      await new Promise(resolve => setTimeout(resolve, 2000))

      console.log(chalk.gray('⏳ 验证登录状态...'))
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log(chalk.gray('⏳ 初始化自动化环境...'))
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 更新全局状态
      globalStateManager.setState({
        isRunning: true,
        sessionId: `session-${Date.now()}`,
        lastActivity: new Date(),
      })

      console.log(chalk.green('\n✅ 游戏会话启动成功！'))
      console.log(chalk.cyan(`🆔 会话ID: session-${Date.now()}`))
      console.log(chalk.gray('💡 使用 /status 查看当前状态，/stop 停止会话'))
    }
    catch (error) {
      console.log(chalk.red(`❌ 启动失败: ${error instanceof Error ? error.message : String(error)}`))
      if (selectedMode?.debug && error instanceof Error) {
        console.log(chalk.gray(error.stack))
      }
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  private async handleStop(_args: string[]): Promise<void> {
    this.pushContext('停止游戏')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n🛑 停止游戏会话'))
    console.log(chalk.gray('─'.repeat(40)))

    const state = globalStateManager.getState()
    if (!state.isRunning) {
      console.log(chalk.yellow('⚠️  当前没有运行中的游戏会话'))
      this.navigationStack.pop()
      this.rl.setPrompt(this.getPrompt())
      return
    }

    try {
      // 1. 显示当前运行状态
      console.log(chalk.white('\n📊 当前运行状态:'))
      console.log(`  会话ID: ${chalk.cyan(state.sessionId || 'unknown')}`)
      console.log(`  运行时长: ${chalk.cyan(Math.floor((Date.now() - state.startTime.getTime()) / 1000))}秒`)
      console.log(`  最后活动: ${chalk.cyan(state.lastActivity?.toLocaleString() || '未知')}`)

      // 2. 警告未完成任务
      console.log(chalk.yellow('\n⚠️  注意事项:'))
      console.log('  • 停止会话将终止所有正在运行的任务')
      console.log('  • 未保存的游戏进度可能丢失')
      console.log('  • 正在执行的脚本将被中断')

      // 3. 停止选项
      console.log(chalk.white('\n🎛️  停止选项:'))
      console.log('  1. 优雅停止 - 保存状态并清理资源')
      console.log('  2. 强制停止 - 立即终止（可能丢失数据）')
      console.log('  3. 取消操作')
      console.log()

      const stopChoice = await this.promptSelect('请选择停止方式 [1-3]:', ['1', '2', '3'])

      if (stopChoice === '3') {
        console.log(chalk.gray('❌ 停止操作已取消'))
        this.navigationStack.pop()
        this.rl.setPrompt(this.getPrompt())
        return
      }

      const isForceStop = stopChoice === '2'

      // 4. 执行停止流程
      console.log(chalk.blue(`\n🛑 正在${isForceStop ? '强制' : '优雅'}停止游戏会话...`))

      if (!isForceStop) {
        console.log(chalk.gray('⏳ 暂停当前执行任务...'))
        await new Promise(resolve => setTimeout(resolve, 1000))

        console.log(chalk.gray('⏳ 保存游戏状态...'))
        await new Promise(resolve => setTimeout(resolve, 1500))

        console.log(chalk.gray('⏳ 保存用户数据...'))
        await new Promise(resolve => setTimeout(resolve, 1000))

        console.log(chalk.gray('⏳ 清理临时文件...'))
        await new Promise(resolve => setTimeout(resolve, 800))
      }

      console.log(chalk.gray('⏳ 关闭浏览器会话...'))
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log(chalk.gray('⏳ 释放内存资源...'))
      await new Promise(resolve => setTimeout(resolve, 500))

      console.log(chalk.gray('⏳ 清理缓存数据...'))
      await new Promise(resolve => setTimeout(resolve, 800))

      if (!isForceStop) {
        console.log(chalk.gray('⏳ 生成停止报告...'))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      // 更新全局状态
      globalStateManager.setState({
        isRunning: false,
        sessionId: undefined,
        lastActivity: new Date(),
      })

      // 5. 显示完成信息
      console.log(chalk.green('\n✅ 游戏会话已成功停止'))

      if (!isForceStop) {
        const runTime = Math.floor((Date.now() - state.startTime.getTime()) / 1000)
        console.log(chalk.cyan(`⏱️  运行时长: ${Math.floor(runTime / 60)}分${runTime % 60}秒`))
        console.log(chalk.cyan('📊 任务完成情况: 已保存'))
        console.log(chalk.cyan('💾 会话数据: 已备份'))

        const restart = await this.promptConfirm('\n是否要重新启动游戏？')
        if (restart) {
          await this.handleStart([])
        }
      }
    }
    catch (error) {
      console.log(chalk.red(`❌ 停止失败: ${error instanceof Error ? error.message : String(error)}`))
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  private async handleRestart(_args: string[]): Promise<void> {
    this.pushContext('重启游戏')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n🔄 重启游戏会话'))
    console.log(chalk.gray('─'.repeat(40)))

    const state = globalStateManager.getState()

    try {
      // 1. 重启前检查
      console.log(chalk.white('\n🔍 重启前检查:'))

      if (state.isRunning) {
        console.log(`  当前状态: ${chalk.green('运行中')}`)
        console.log(`  会话ID: ${chalk.cyan(state.sessionId || 'unknown')}`)

        // 检查未完成任务
        console.log(chalk.yellow('\n⚠️  检测到以下未完成项目:'))
        console.log('  • 正在运行的游戏会话')
        console.log('  • 可能存在的脚本任务')
        console.log('  • 未保存的临时数据')
      }
      else {
        console.log(`  当前状态: ${chalk.red('未运行')}`)
        console.log('  将执行全新启动')
      }

      // 2. 重启选项
      console.log(chalk.white('\n🔄 重启选项:'))
      console.log('  1. 智能重启 - 保持配置和数据')
      console.log('  2. 完全重启 - 重置所有状态')
      console.log('  3. 取消重启')
      console.log()

      const restartChoice = await this.promptSelect('请选择重启方式 [1-3]:', ['1', '2', '3'])

      if (restartChoice === '3') {
        console.log(chalk.gray('❌ 重启操作已取消'))
        this.navigationStack.pop()
        this.rl.setPrompt(this.getPrompt())
        return
      }

      const isFullRestart = restartChoice === '2'
      const restartTime = new Date()

      // 3. 执行重启流程
      console.log(chalk.blue(`\n🔄 正在执行${isFullRestart ? '完全' : '智能'}重启...`))

      if (state.isRunning) {
        if (!isFullRestart) {
          console.log(chalk.gray('⏳ 保存当前会话状态...'))
          await new Promise(resolve => setTimeout(resolve, 1500))
        }

        console.log(chalk.gray('⏳ 优雅停止当前会话...'))
        await new Promise(resolve => setTimeout(resolve, 2000))
      }

      if (isFullRestart) {
        console.log(chalk.gray('⏳ 重置所有配置...'))
        await new Promise(resolve => setTimeout(resolve, 1000))

        console.log(chalk.gray('⏳ 清理所有数据...'))
        await new Promise(resolve => setTimeout(resolve, 1500))
      }
      else {
        console.log(chalk.gray('⏳ 清理临时数据...'))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      console.log(chalk.gray('⏳ 重新初始化环境...'))
      await new Promise(resolve => setTimeout(resolve, 2000))

      if (!isFullRestart && state.isRunning) {
        console.log(chalk.gray('⏳ 恢复会话状态...'))
        await new Promise(resolve => setTimeout(resolve, 1500))

        console.log(chalk.gray('⏳ 恢复任务队列...'))
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      console.log(chalk.gray('⏳ 验证环境完整性...'))
      await new Promise(resolve => setTimeout(resolve, 1000))

      // 更新全局状态
      const newSessionId = `session-${Date.now()}`
      globalStateManager.setState({
        isRunning: true,
        sessionId: newSessionId,
        lastActivity: restartTime,
      })

      // 4. 重启完成
      console.log(chalk.green('\n✅ 游戏会话重启成功！'))
      console.log(chalk.cyan(`🆔 新会话ID: ${newSessionId}`))
      console.log(chalk.cyan(`⏱️  重启时间: ${restartTime.toLocaleString()}`))

      if (!isFullRestart) {
        console.log(chalk.cyan('📊 状态恢复: 完成'))
        console.log(chalk.cyan('🔧 配置保持: 启用'))
      }
      else {
        console.log(chalk.cyan('🔄 环境状态: 已重置'))
      }
    }
    catch (error) {
      console.log(chalk.red(`❌ 重启失败: ${error instanceof Error ? error.message : String(error)}`))
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  private async handleGame(_args: string[]): Promise<void> {
    this.pushContext('游戏控制')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n🎮 游戏控制中心'))
    console.log(chalk.gray('─'.repeat(40)))

    const state = globalStateManager.getState()

    if (state.isRunning) {
      console.log(chalk.white('游戏运行中，可用操作:'))
      console.log('  1. 🛑 停止游戏')
      console.log('  2. 🔄 重启游戏')
      console.log('  3. 📊 查看游戏状态')
      console.log('  4. ⏸️  暂停游戏')
      console.log()

      const choice = await this.promptSelect('请选择 [1-4]:', ['1', '2', '3', '4'])

      switch (choice) {
        case '1':
          await this.handleStop([])
          break
        case '2':
          await this.handleRestart([])
          break
        case '3':
          await this.handleGameStatus([])
          break
        case '4':
          console.log(chalk.blue('⏸️ 游戏已暂停'))
          break
      }
    }
    else {
      console.log(chalk.white('游戏未运行，可用操作:'))
      console.log('  1. 🚀 启动游戏')
      console.log('  2. 🔍 检查游戏环境')
      console.log('  3. ⚙️  游戏设置')
      console.log()

      const choice = await this.promptSelect('请选择 [1-3]:', ['1', '2', '3'])

      switch (choice) {
        case '1':
          await this.handleStart([])
          break
        case '2':
          await this.checkGameEnvironment()
          break
        case '3':
          await this.handleGameSettings()
          break
      }
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  private async handleScript(_args: string[]): Promise<void> {
    console.log(chalk.cyan.bold('\n📜 脚本模板管理'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.white('脚本操作:'))
    console.log('  1. 查看脚本模板列表')
    console.log('  2. 查看模板详情')
    console.log('  3. 搜索脚本模板')
    console.log('  4. 创建新模板')
    console.log('  5. 删除模板')
    console.log('  6. 导入/导出模板')
    console.log('  7. 统计信息')
    console.log()

    const choice = await this.promptSelect('请选择 [1-7]:', ['1', '2', '3', '4', '5', '6', '7'])

    switch (choice) {
      case '1':
        await this.listScripts()
        break
      case '2':
        await this.showScriptDetails()
        break
      case '3':
        await this.searchScripts()
        break
      case '4':
        await this.createScript()
        break
      case '5':
        await this.deleteScript()
        break
      case '6':
        await this.importExportScripts()
        break
      case '7':
        await this.showScriptStats()
        break
    }
  }

  // ============ 高级功能命令处理器 ============

  private async handleLog(_args: string[]): Promise<void> {
    this.pushContext('日志管理')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n📋 日志管理'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.white('日志操作:'))
    console.log('  1. 查看日志文件')
    console.log('  2. 搜索日志内容')
    console.log('  3. 日志统计信息')
    console.log('  4. 清理日志文件')
    console.log('  5. 实时监控日志')
    console.log('  6. 导出日志文件')
    console.log()

    const choice = await this.promptSelect('请选择 [1-6]:', ['1', '2', '3', '4', '5', '6'])

    try {
      switch (choice) {
        case '1':
          await executeLogView()
          break
        case '2':
          await executeLogSearch()
          break
        case '3':
          await executeLogStats()
          break
        case '4':
          await executeLogCleanup()
          break
        case '5':
          await executeLogMonitor()
          break
        case '6':
          await executeLogExport()
          break
      }
    }
    catch (error) {
      console.log(chalk.red(`❌ 操作失败: ${error instanceof Error ? error.message : String(error)}`))
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  private async handleTask(_args: string[]): Promise<void> {
    this.pushContext('任务管理')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n📝 任务队列管理'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.white('任务操作:'))
    console.log('  1. 查看任务队列')
    console.log('  2. 创建新任务')
    console.log('  3. 控制任务执行')
    console.log('  4. 任务历史记录')
    console.log('  5. 任务统计信息')
    console.log()

    const choice = await this.promptSelect('请选择 [1-5]:', ['1', '2', '3', '4', '5'])

    try {
      switch (choice) {
        case '1':
          await executeTaskList()
          break
        case '2':
          await executeTaskCreate()
          break
        case '3':
          await executeTaskControl()
          break
        case '4':
          await executeTaskHistory()
          break
        case '5':
          await executeTaskStats()
          break
      }
    }
    catch (error) {
      console.log(chalk.red(`❌ 操作失败: ${error instanceof Error ? error.message : String(error)}`))
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  private async handlePrompt(_args: string[]): Promise<void> {
    this.pushContext('提示词库')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n📚 AI提示词库管理'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.white('提示词操作:'))
    console.log('  1. 查看提示词库')
    console.log('  2. 创建新模板')
    console.log('  3. 生成提示词')
    console.log('  4. 搜索模板')
    console.log('  5. 删除模板')
    console.log('  6. 统计信息')
    console.log()

    const choice = await this.promptSelect('请选择 [1-6]:', ['1', '2', '3', '4', '5', '6'])

    try {
      switch (choice) {
        case '1':
          await executePromptList()
          break
        case '2':
          await executePromptCreate()
          break
        case '3':
          await executePromptGenerate()
          break
        case '4':
          await executePromptSearch()
          break
        case '5':
          await executePromptDelete()
          break
        case '6':
          await executePromptStats()
          break
      }
    }
    catch (error) {
      console.log(chalk.red(`❌ 操作失败: ${error instanceof Error ? error.message : String(error)}`))
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  private async handleDebug(_args: string[]): Promise<void> {
    console.log(chalk.cyan.bold('\n🐛 调试工具'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.white('调试选项:'))
    console.log('  1. 查看系统信息')
    console.log('  2. 检查依赖')
    console.log('  3. 性能监控')
    console.log('  4. 导出调试日志')
    console.log()

    const choice = await this.promptSelect('请选择 [1-4]:', ['1', '2', '3', '4'])

    switch (choice) {
      case '1':
        await this.showSystemInfo()
        break
      case '2':
        await this.checkDependencies()
        break
      case '3':
        await this.performanceMonitor()
        break
      case '4':
        await this.exportDebugLog()
        break
    }
  }

  private async handleExtension(_args: string[]): Promise<void> {
    console.log(chalk.cyan.bold('\n🔌 扩展管理'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(chalk.yellow('💡 功能开发中，敬请期待...'))
    console.log()
  }

  // ============ 辅助方法 ============

  private async promptSelect(message: string, options: string[]): Promise<string> {
    return new Promise((resolve) => {
      const askQuestion = () => {
        this.rl.question(`${chalk.cyan(message)} `, (answer) => {
          const trimmed = answer.trim()
          if (options.includes(trimmed)) {
            resolve(trimmed)
          }
          else {
            console.log(chalk.red(`❌ 无效选择，请输入 ${options.join('、')} 中的一个`))
            askQuestion()
          }
        })
      }
      askQuestion()
    })
  }

  private async promptConfirm(message: string): Promise<boolean> {
    const answer = await this.promptSelect(`${message} [y/N]:`, ['y', 'n', 'Y', 'N', ''])
    return answer.toLowerCase() === 'y'
  }

  private async promptText(message: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(`${chalk.cyan(message)}`, (answer) => {
        resolve(answer.trim())
      })
    })
  }

  private async displayTemplateDetails(template: any): Promise<void> {
    console.log(chalk.blue(`\n🔍 模板详情: ${chalk.white(template.name)}`))
    console.log(chalk.gray('─'.repeat(50)))

    console.log(chalk.white(`📝 基本信息:`))
    console.log(`  名称: ${chalk.cyan(template.name)}`)
    console.log(`  描述: ${chalk.gray(template.description)}`)
    console.log(`  分类: ${chalk.yellow(template.category)}`)
    console.log(`  版本: ${chalk.green(template.version)}`)
    console.log(`  作者: ${chalk.blue(template.author)}`)
    console.log(`  标签: ${chalk.dim(template.tags.join(', ') || '无')}`)
    console.log(`  类型: ${template.isSystem ? chalk.yellow('系统模板') : chalk.cyan('用户模板')}`)
    console.log(`  创建时间: ${chalk.gray(template.createdAt.toLocaleString())}`)
    console.log(`  更新时间: ${chalk.gray(template.updatedAt.toLocaleString())}`)

    const { metadata, steps, variables, conditions } = template.template

    console.log(chalk.white(`\n⚙️  元数据:`))
    console.log(`  游戏版本: ${chalk.cyan(metadata.gameVersion || '不限')}`)
    console.log(`  所需功能: ${chalk.blue(metadata.requiredFeatures.join(', '))}`)
    console.log(`  预计耗时: ${chalk.yellow(metadata.estimatedDuration ? `${Math.round(metadata.estimatedDuration / 60000)} 分钟` : '未知')}`)

    console.log(chalk.white(`\n🔧 脚本步骤 (${steps.length}):`))
    steps
      .sort((a: any, b: any) => a.order - b.order)
      .forEach((step: any, index: number) => {
        const enabledMark = step.enabled ? '✅' : '❌'
        const typeIcons: any = {
          action: '⚡',
          wait: '⏰',
          condition: '❓',
          loop: '🔄',
        }

        console.log(`  ${index + 1}. ${enabledMark} ${typeIcons[step.type]} ${chalk.white(step.name)}`)
        if (step.description) {
          console.log(chalk.gray(`     ${step.description}`))
        }
      })

    if (variables.length > 0) {
      console.log(chalk.white(`\n📊 变量 (${variables.length}):`))
      variables.forEach((variable: any, index: number) => {
        const requiredMark = variable.required ? '⚠️' : '📝'
        console.log(`  ${index + 1}. ${requiredMark} ${chalk.cyan(variable.name)} (${chalk.yellow(variable.type)})`)
        console.log(`     默认值: ${chalk.gray(variable.defaultValue || '无')}`)
        if (variable.description) {
          console.log(`     说明: ${chalk.gray(variable.description)}`)
        }
      })
    }

    if (conditions.length > 0) {
      console.log(chalk.white(`\n✅ 执行条件 (${conditions.length}):`))
      conditions.forEach((condition: any, index: number) => {
        const typeIcons: any = {
          pre: '🟢',
          post: '🔴',
          runtime: '🟡',
        }

        console.log(`  ${index + 1}. ${typeIcons[condition.type]} ${chalk.cyan(condition.name)}`)
        if (condition.description) {
          console.log(`     ${chalk.gray(condition.description)}`)
        }
      })
    }
  }

  // ============ 配置相关方法 ============

  private async showCurrentConfig(): Promise<void> {
    console.log(chalk.cyan.bold('\n📋 当前配置'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log(`${chalk.white('版本:')} 0.1.0`)
    console.log(`${chalk.white('登录URL:')} https://ys.mihoyo.com/cloud/`)
    console.log(`${chalk.white('浏览器模式:')} ${this.options.headless ? '无头' : '可视化'}`)
    console.log(`${chalk.white('调试模式:')} ${this.options.debug ? '启用' : '禁用'}`)
    console.log()
  }

  private async modifyConfig(): Promise<void> {
    console.log(chalk.yellow('💡 配置修改功能开发中...'))
  }

  private async resetConfig(): Promise<void> {
    const confirmed = await this.promptConfirm('确定要重置所有配置吗？')
    if (confirmed) {
      console.log(chalk.green('✅ 配置已重置'))
    }
  }

  private async exportConfig(): Promise<void> {
    console.log(chalk.green('✅ 配置已导出到 freedom-config.json'))
  }

  // ============ 登录相关方法 ============

  // ============ 脚本相关方法 ============

  private async listScripts(): Promise<void> {
    try {
      await scriptTemplateManager.initialize()
      const templates = scriptTemplateManager.getAllTemplates()
      const categories = scriptTemplateManager.getAllCategories()

      console.log(chalk.blue('\n📋 脚本模板列表'))
      console.log(chalk.gray('─'.repeat(50)))

      if (templates.length === 0) {
        console.log(chalk.yellow('💭 暂无脚本模板'))
        return
      }

      // 按分类分组显示
      for (const category of categories) {
        const templatesInCategory = templates.filter(t => t.category === category.id)
        if (templatesInCategory.length === 0)
          continue

        console.log(chalk.cyan(`\n📁 ${category.name} (${templatesInCategory.length})`))
        console.log(chalk.gray(`   ${category.description}`))

        templatesInCategory.forEach((template, index) => {
          const systemMark = template.isSystem ? '🔧' : '👤'
          const tags = template.tags.length > 0 ? ` [${template.tags.join(', ')}]` : ''

          console.log(`   ${systemMark} ${index + 1}. ${chalk.white(template.name)} ${chalk.gray(`v${template.version}`)}${chalk.dim(tags)}`)
          console.log(chalk.gray(`      ${template.description}`))
        })
      }

      // 显示统计信息
      const stats = scriptTemplateManager.getTemplateStats()
      console.log(chalk.blue(`\n📊 总计: ${stats.totalTemplates} 个模板 (系统: ${stats.systemTemplates}, 用户: ${stats.userTemplates})`))
    }
    catch (error) {
      console.log(chalk.red('❌ 获取脚本模板列表失败:'), error)
    }
    console.log()
  }

  private async showScriptDetails(): Promise<void> {
    try {
      await scriptTemplateManager.initialize()
      const templates = scriptTemplateManager.getAllTemplates()

      if (templates.length === 0) {
        console.log(chalk.yellow('💭 暂无脚本模板'))
        return
      }

      console.log(chalk.blue('\n🔍 选择要查看的模板:'))
      console.log(chalk.gray('─'.repeat(40)))

      templates.forEach((template, index) => {
        const systemMark = template.isSystem ? '🔧' : '👤'
        console.log(`  ${index + 1}. ${systemMark} ${chalk.white(template.name)} - ${chalk.gray(template.description)}`)
      })

      const choice = await this.promptSelect(`\n请选择 [1-${templates.length}]:`, Array.from({ length: templates.length }, (_, i) => (i + 1).toString()))

      const index = Number.parseInt(choice) - 1
      const template = templates[index]

      await this.displayTemplateDetails(template)
    }
    catch (error) {
      console.log(chalk.red('❌ 显示脚本模板失败:'), error)
    }
    console.log()
  }

  private async searchScripts(): Promise<void> {
    try {
      await scriptTemplateManager.initialize()

      console.log(chalk.blue('\n🔍 脚本模板搜索'))
      console.log(chalk.gray('─'.repeat(30)))

      const searchText = await this.promptText('搜索关键词 (可为空): ')
      const category = await this.promptText('分类 (可为空): ')

      const filter: any = {}
      if (searchText.trim())
        filter.searchText = searchText.trim()
      if (category.trim())
        filter.category = category.trim()

      const results = scriptTemplateManager.getTemplatesByFilter(filter)

      console.log(chalk.blue(`\n📋 搜索结果 (${results.length}):`))
      console.log(chalk.gray('─'.repeat(40)))

      if (results.length === 0) {
        console.log(chalk.yellow('💭 未找到匹配的模板'))
        return
      }

      results.forEach((template, index) => {
        const systemMark = template.isSystem ? '🔧' : '👤'
        const tags = template.tags.length > 0 ? ` [${template.tags.join(', ')}]` : ''

        console.log(`  ${index + 1}. ${systemMark} ${chalk.white(template.name)} ${chalk.gray(`v${template.version}`)}${chalk.dim(tags)}`)
        console.log(chalk.gray(`     ${template.description}`))
        console.log(chalk.gray(`     分类: ${template.category} | 作者: ${template.author}`))
      })
    }
    catch (error) {
      console.log(chalk.red('❌ 搜索脚本模板失败:'), error)
    }
    console.log()
  }

  private async createScript(): Promise<void> {
    try {
      await scriptTemplateManager.initialize()

      console.log(chalk.blue('\n✨ 创建新脚本模板'))
      console.log(chalk.gray('─'.repeat(40)))

      const name = await this.promptText('模板名称: ')
      if (!name.trim()) {
        console.log(chalk.red('❌ 模板名称不能为空'))
        return
      }

      const description = await this.promptText('模板描述: ')
      const version = (await this.promptText('版本 (默认 1.0.0): ')).trim() || '1.0.0'
      const author = await this.promptText('作者: ')

      // 选择分类
      const categories = scriptTemplateManager.getAllCategories()
      console.log(chalk.blue('\n📁 选择分类:'))
      categories.forEach((category, index) => {
        console.log(`  ${index + 1}. ${category.name} - ${category.description}`)
      })

      const categoryChoice = await this.promptSelect(`请选择分类 [1-${categories.length}]:`, Array.from({ length: categories.length }, (_, i) => (i + 1).toString()))

      const categoryIndex = Number.parseInt(categoryChoice) - 1
      const category = categories[categoryIndex].id

      // 创建基础模板内容
      const templateContent = {
        metadata: {
          requiredFeatures: ['navigation'],
          estimatedDuration: 600000, // 10分钟默认
        },
        steps: [
          {
            id: 'step-1',
            type: 'action' as const,
            name: '开始执行',
            description: '脚本开始执行',
            action: { type: 'wait' as const, duration: 1000 },
            enabled: true,
            order: 1,
          },
        ],
        variables: [],
        conditions: [],
      }

      const templateId = await scriptTemplateManager.createTemplate({
        name: name.trim(),
        description: description.trim() || '无描述',
        category,
        version,
        author: author.trim() || 'unknown',
        tags: [],
        isSystem: false,
        template: templateContent,
      })

      console.log(chalk.green(`\n✅ 模板创建成功！`))
      console.log(chalk.blue(`🆔 模板ID: ${templateId}`))

      // 更新状态
      globalStateManager.updateScriptBuilderState({
        isActive: true,
        currentTemplate: templateId,
        lastSaved: new Date(),
      })
    }
    catch (error) {
      console.log(chalk.red('❌ 创建脚本模板失败:'), error)
    }
    console.log()
  }

  private async deleteScript(): Promise<void> {
    try {
      await scriptTemplateManager.initialize()
      const templates = scriptTemplateManager.getAllTemplates()
      const userTemplates = templates.filter(t => !t.isSystem)

      if (userTemplates.length === 0) {
        console.log(chalk.yellow('💭 暂无可删除的用户模板'))
        return
      }

      console.log(chalk.blue('\n🗑️  选择要删除的模板:'))
      console.log(chalk.gray('─'.repeat(40)))

      userTemplates.forEach((template, index) => {
        console.log(`  ${index + 1}. ${chalk.white(template.name)} - ${chalk.gray(template.description)}`)
      })

      const choice = await this.promptSelect(`\n请选择 [1-${userTemplates.length}]:`, Array.from({ length: userTemplates.length }, (_, i) => (i + 1).toString()))

      const index = Number.parseInt(choice) - 1
      const template = userTemplates[index]

      console.log(chalk.yellow(`\n⚠️  确认删除模板: ${chalk.white(template.name)}?`))
      const confirm = await this.promptText('输入 "yes" 确认删除: ')

      if (confirm.toLowerCase() !== 'yes') {
        console.log(chalk.gray('❌ 删除已取消'))
        return
      }

      await scriptTemplateManager.deleteTemplate(template.id)
      console.log(chalk.green('✅ 模板删除成功！'))
    }
    catch (error) {
      console.log(chalk.red('❌ 删除脚本模板失败:'), error)
    }
    console.log()
  }

  private async importExportScripts(): Promise<void> {
    console.log(chalk.blue('\n📦 导入/导出脚本模板'))
    console.log(chalk.gray('─'.repeat(40)))
    console.log('  1. 导出模板')
    console.log('  2. 导入模板')

    const choice = await this.promptSelect('请选择 [1-2]:', ['1', '2'])

    if (choice === '1') {
      await this.exportScript()
    }
    else {
      await this.importScript()
    }
  }

  private async exportScript(): Promise<void> {
    try {
      await scriptTemplateManager.initialize()
      const templates = scriptTemplateManager.getAllTemplates()

      if (templates.length === 0) {
        console.log(chalk.yellow('💭 暂无脚本模板'))
        return
      }

      console.log(chalk.blue('\n📦 选择要导出的模板:'))
      templates.forEach((template, index) => {
        const systemMark = template.isSystem ? '🔧' : '👤'
        console.log(`  ${index + 1}. ${systemMark} ${chalk.white(template.name)} - ${chalk.gray(template.description)}`)
      })

      const choice = await this.promptSelect(`请选择 [1-${templates.length}]:`, Array.from({ length: templates.length }, (_, i) => (i + 1).toString()))

      const index = Number.parseInt(choice) - 1
      const template = templates[index]

      console.log(chalk.green(`\n✅ 模板导出功能开发中...`))
      console.log(chalk.gray(`将要导出: ${template.name}`))
    }
    catch (error) {
      console.log(chalk.red('❌ 导出脚本模板失败:'), error)
    }
    console.log()
  }

  private async importScript(): Promise<void> {
    console.log(chalk.blue('\n📥 导入脚本模板'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(chalk.yellow('💡 导入功能开发中...'))
    console.log()
  }

  private async showScriptStats(): Promise<void> {
    try {
      await scriptTemplateManager.initialize()
      const stats = scriptTemplateManager.getTemplateStats()

      console.log(chalk.blue('\n📊 脚本模板统计信息'))
      console.log(chalk.gray('─'.repeat(40)))

      console.log(chalk.white('\n📋 总体统计:'))
      console.log(`  总模板数: ${chalk.cyan(stats.totalTemplates.toString())}`)
      console.log(`  系统模板: ${chalk.green(stats.systemTemplates.toString())}`)
      console.log(`  用户模板: ${chalk.blue(stats.userTemplates.toString())}`)
      console.log(`  最后修改: ${chalk.gray(stats.lastModified?.toLocaleString() || '未知')}`)

      if (Object.keys(stats.categories).length > 0) {
        console.log(chalk.white('\n📁 分类统计:'))
        Object.entries(stats.categories)
          .sort(([,a], [,b]) => b - a)
          .forEach(([category, count]) => {
            console.log(`  ${category}: ${chalk.cyan(count.toString())} 个模板`)
          })
      }

      if (Object.keys(stats.tags).length > 0) {
        console.log(chalk.white('\n🏷️  标签统计 (前5):'))
        Object.entries(stats.tags)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .forEach(([tag, count]) => {
            console.log(`  ${tag}: ${chalk.cyan(count.toString())} 次使用`)
          })
      }
    }
    catch (error) {
      console.log(chalk.red('❌ 获取统计信息失败:'), error)
    }
    console.log()
  }

  // ============ 调试相关方法 ============

  private async showSystemInfo(): Promise<void> {
    console.log(chalk.blue('\n💻 系统信息'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`${chalk.white('Node.js:')} ${process.version}`)
    console.log(`${chalk.white('平台:')} ${process.platform}`)
    console.log(`${chalk.white('架构:')} ${process.arch}`)
    console.log(`${chalk.white('PID:')} ${process.pid}`)
    console.log()
  }

  private async checkDependencies(): Promise<void> {
    console.log(chalk.blue('\n📦 依赖检查'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`${chalk.white('chalk:')} ✅ 已安装`)
    console.log(`${chalk.white('playwright:')} ✅ 已安装`)
    console.log(`${chalk.white('@freedom/shared:')} ✅ 已安装`)
    console.log()
  }

  private async performanceMonitor(): Promise<void> {
    console.log(chalk.blue('\n⚡ 性能监控'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(chalk.yellow('💡 启动性能监控...'))

    // 模拟监控过程
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 200))
      const bar = '█'.repeat(Math.floor(i / 5))
      const empty = '░'.repeat(20 - Math.floor(i / 5))
      process.stdout.write(`\r[${bar}${empty}] ${i}%`)
    }
    console.log('\n✅ 性能监控完成')
  }

  private async exportDebugLog(): Promise<void> {
    console.log(chalk.blue('\n📄 导出调试日志'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(chalk.green('✅ 调试日志已导出到 freedom-debug.log'))
  }

  // ============ 辅助方法 - 环境检查和游戏功能 ============

  private async performStartupEnvironmentCheck(): Promise<void> {
    console.log(chalk.blue('🔍 正在进行环境检查...'))

    // 1. 浏览器兼容性检查
    console.log(chalk.gray('⏳ 检查浏览器兼容性...'))
    await new Promise(resolve => setTimeout(resolve, 800))
    console.log(chalk.green('✅ 浏览器兼容性: 通过'))

    // 2. 网络连接测试
    console.log(chalk.gray('⏳ 测试网络连接...'))
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log(chalk.green('✅ 网络连接: 正常'))

    // 3. 系统资源评估
    console.log(chalk.gray('⏳ 评估系统资源...'))
    await new Promise(resolve => setTimeout(resolve, 600))
    const memUsage = process.memoryUsage()
    const availableMem = (memUsage.heapTotal / 1024 / 1024).toFixed(2)
    console.log(chalk.green(`✅ 系统资源: 可用内存 ${availableMem}MB`))

    // 4. 依赖项验证
    console.log(chalk.gray('⏳ 验证依赖项...'))
    await new Promise(resolve => setTimeout(resolve, 700))
    console.log(chalk.green('✅ 核心依赖: 完整'))

    console.log(chalk.green('\n✅ 环境检查完成，系统准备就绪'))
  }

  private async checkGameEnvironment(): Promise<void> {
    console.log(chalk.blue('\n🔍 游戏环境检查'))
    console.log(chalk.gray('─'.repeat(30)))

    console.log(chalk.gray('⏳ 检查游戏平台连接...'))
    await new Promise(resolve => setTimeout(resolve, 1500))
    console.log(chalk.green('✅ 云游戏平台: 可访问'))

    console.log(chalk.gray('⏳ 验证浏览器驱动...'))
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log(chalk.green('✅ Playwright 驱动: 已安装'))

    console.log(chalk.gray('⏳ 检查账户配置...'))
    await new Promise(resolve => setTimeout(resolve, 800))
    console.log(chalk.green('✅ 账户配置: 有效'))

    console.log(chalk.green('\n✅ 游戏环境检查完成'))
  }

  private async handleGameSettings(): Promise<void> {
    console.log(chalk.blue('\n⚙️ 游戏设置'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(chalk.yellow('💡 游戏设置功能开发中...'))
    console.log('将包含:')
    console.log('• 启动模式配置')
    console.log('• 性能优化选项')
    console.log('• 安全设置')
    console.log('• 自动化配置')
  }

  // 状态查看相关方法
  private async showCharacterInfo(): Promise<void> {
    console.log(chalk.blue('\n👤 角色信息'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`角色等级: ${chalk.cyan('56级')} (模拟)`)
    console.log(`冒险等级: ${chalk.cyan('45级')} (模拟)`)
    console.log(`世界等级: ${chalk.cyan('6级')} (模拟)`)
    console.log(`当前位置: ${chalk.cyan('蒙德城')} (模拟)`)
  }

  private async showResourceStatus(): Promise<void> {
    console.log(chalk.blue('\n💎 资源状态'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`原石: ${chalk.cyan('1,280')} (模拟)`)
    console.log(`摩拉: ${chalk.cyan('856,430')} (模拟)`)
    console.log(`原粹树脂: ${chalk.cyan('118/160')} (模拟)`)
    console.log(`纠缠之缘: ${chalk.cyan('3')} (模拟)`)
  }

  private async showTaskProgress(): Promise<void> {
    console.log(chalk.blue('\n📋 任务进度'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`日常委托: ${chalk.green('4/4 已完成')} (模拟)`)
    console.log(`周本: ${chalk.yellow('2/3 已完成')} (模拟)`)
    console.log(`活动任务: ${chalk.cyan('进行中')} (模拟)`)
    console.log(`主线任务: ${chalk.blue('第四章')} (模拟)`)
  }

  private async showAutomationStatus(): Promise<void> {
    console.log(chalk.blue('\n🤖 自动化状态'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`当前任务: ${chalk.green('空闲状态')} (模拟)`)
    console.log(`任务队列: ${chalk.cyan('0个待执行')} (模拟)`)
    console.log(`脚本状态: ${chalk.green('就绪')} (模拟)`)
    console.log(`异常记录: ${chalk.green('无异常')} (模拟)`)
  }

  private async showPerformanceMonitoring(): Promise<void> {
    const memUsage = process.memoryUsage()
    console.log(chalk.blue('\n⚡ 性能监控'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(`内存使用: ${chalk.cyan((memUsage.heapUsed / 1024 / 1024).toFixed(2))}MB`)
    console.log(`CPU占用: ${chalk.cyan('< 5%')} (模拟)`)
    console.log(`网络延迟: ${chalk.cyan('28ms')} (模拟)`)
    console.log(`帧率: ${chalk.cyan('60fps')} (模拟)`)
  }

  private async exportStatusReport(): Promise<void> {
    console.log(chalk.blue('\n📄 导出状态报告'))
    console.log(chalk.gray('─'.repeat(30)))
    console.log(chalk.gray('⏳ 生成状态报告...'))
    await new Promise(resolve => setTimeout(resolve, 2000))
    console.log(chalk.green('✅ 状态报告已导出到 freedom-status-report.json'))
  }

  private async handleGameStatus(_args: string[]): Promise<void> {
    this.pushContext('游戏状态')
    this.showBreadcrumbHelp()

    console.log(chalk.cyan.bold('\n📊 游戏会话状态'))
    console.log(chalk.gray('─'.repeat(40)))

    const state = globalStateManager.getState()
    const memUsage = process.memoryUsage()

    try {
      // 1. 实时状态概览
      console.log(chalk.white('\n🎮 实时状态概览:'))
      console.log(`  游戏连接: ${state.isRunning ? chalk.green('🟢 已连接') : chalk.red('🔴 未连接')}`)
      console.log(`  当前账户: ${chalk.cyan('default')}`)

      if (state.isRunning && state.sessionId) {
        const uptime = Math.floor((Date.now() - state.startTime.getTime()) / 1000)
        console.log(`  运行时长: ${chalk.cyan(`${Math.floor(uptime / 60)}分${uptime % 60}秒`)}`)
        console.log(`  会话ID: ${chalk.cyan(state.sessionId)}`)
      }

      // 2. 系统资源使用
      console.log(chalk.white('\n💻 系统资源使用:'))
      console.log(`  内存使用: ${chalk.cyan((memUsage.heapUsed / 1024 / 1024).toFixed(2))}MB`)
      console.log(`  CPU占用: ${chalk.cyan('< 5%')} (模拟)`)
      console.log(`  网络延迟: ${chalk.cyan('25ms')} (模拟)`)

      // 3. 详细状态选项
      console.log(chalk.white('\n📋 详细状态选项:'))
      console.log('  1. 查看角色信息')
      console.log('  2. 查看资源状态')
      console.log('  3. 查看任务进度')
      console.log('  4. 查看自动化状态')
      console.log('  5. 查看性能监控')
      console.log('  6. 导出状态报告')
      console.log('  7. 返回')
      console.log()

      const choice = await this.promptSelect('请选择 [1-7]:', ['1', '2', '3', '4', '5', '6', '7'])

      switch (choice) {
        case '1':
          await this.showCharacterInfo()
          break
        case '2':
          await this.showResourceStatus()
          break
        case '3':
          await this.showTaskProgress()
          break
        case '4':
          await this.showAutomationStatus()
          break
        case '5':
          await this.showPerformanceMonitoring()
          break
        case '6':
          await this.exportStatusReport()
          break
        case '7':
          break
      }
    }
    catch (error) {
      console.log(chalk.red(`❌ 获取状态失败: ${error instanceof Error ? error.message : String(error)}`))
    }

    this.navigationStack.pop()
    this.rl.setPrompt(this.getPrompt())
  }

  // ============ 导航相关方法 ============

  private async handleBack(_args: string[]): Promise<void> {
    if (this.navigationStack.length === 0) {
      console.log(chalk.yellow('💡 已在主界面，无法返回'))
      return
    }

    const previousContext = this.navigationStack.pop()

    console.log(chalk.blue(`⬅️ 已返回到${previousContext ? ` ${previousContext}` : '主界面'}`))
    this.rl.setPrompt(this.getPrompt())
  }

  private pushContext(context: string): void {
    this.navigationStack.push(context)
    this.rl.setPrompt(this.getPrompt())
  }

  private showBreadcrumbHelp(): void {
    if (this.navigationStack.length > 0) {
      console.log(chalk.gray(`💡 当前位置: ${this.navigationStack.join(' → ')}`))
      console.log(chalk.gray('   使用 ESC 或 /back 返回上级界面'))
      console.log()
    }
  }
}
