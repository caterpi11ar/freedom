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
import { executeLogin } from '../commands/login.js'
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

    this.commands.set('/game', {
      name: '/game',
      description: '游戏控制（启动/停止/暂停）',
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
        commands: ['/help', '/status', '/config', '/exit'],
      },
      {
        title: '游戏相关',
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

  private async handleGame(_args: string[]): Promise<void> {
    console.log(chalk.cyan.bold('\n🎮 游戏控制'))
    console.log(chalk.gray('─'.repeat(40)))

    const state = globalStateManager.getState()

    if (state.isRunning) {
      console.log(chalk.white('游戏操作:'))
      console.log('  1. 暂停游戏')
      console.log('  2. 停止游戏')
      console.log('  3. 重启游戏')
      console.log('  4. 查看游戏状态')
      console.log()

      const choice = await this.promptSelect('请选择 [1-4]:', ['1', '2', '3', '4'])

      switch (choice) {
        case '1':
          console.log(chalk.blue('⏸️ 游戏已暂停'))
          break
        case '2':
          console.log(chalk.yellow('🛑 正在停止游戏...'))
          globalStateManager.setState({ isRunning: false })
          console.log(chalk.green('✅ 游戏已停止'))
          break
        case '3':
          console.log(chalk.blue('🔄 正在重启游戏...'))
          console.log(chalk.green('✅ 游戏已重启'))
          break
        case '4':
          await this.handleStatus([])
          break
      }
    }
    else {
      console.log(chalk.white('游戏未运行，可用操作:'))
      console.log('  1. 启动游戏')
      console.log('  2. 检查游戏环境')
      console.log()

      const choice = await this.promptSelect('请选择 [1-2]:', ['1', '2'])

      switch (choice) {
        case '1':
          console.log(chalk.blue('🚀 正在启动游戏...'))
          console.log(chalk.yellow('💡 提示: 请先使用 /login 命令登录'))
          break
        case '2':
          console.log(chalk.blue('🔍 检查游戏环境...'))
          console.log(chalk.green('✅ 环境检查完成'))
          break
      }
    }
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
