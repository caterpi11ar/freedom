import type { LoginCredentials } from '@freedom/core'
import type { Browser, Page } from 'playwright'
// 交互式模式 - 只支持斜杠命令
import process from 'node:process'
import readline from 'node:readline'
import { LoginAutomator } from '@freedom/core'
import { globalStateManager } from '@freedom/shared'
import chalk from 'chalk'
import { chromium } from 'playwright'

interface SlashCommand {
  name: string
  description: string
  handler: (args: string[]) => Promise<void>
}

export class InteractiveMode {
  private rl: readline.Interface
  private browser: Browser | null = null
  private page: Page | null = null
  private loginAutomator: LoginAutomator | null = null

  private commands: Map<string, SlashCommand> = new Map()

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('freedom> '),
    })

    this.setupCommands()
    this.setupEventHandlers()
  }

  private setupCommands(): void {
    this.commands.set('/help', {
      name: '/help',
      description: '显示所有可用的命令',
      handler: this.handleHelp.bind(this),
    })

    this.commands.set('/login', {
      name: '/login',
      description: '自动登录游戏 /login <username> <password> [url]',
      handler: this.handleLogin.bind(this),
    })

    this.commands.set('/status', {
      name: '/status',
      description: '显示当前游戏状态',
      handler: this.handleStatus.bind(this),
    })

    this.commands.set('/config', {
      name: '/config',
      description: '显示或设置配置 [key] [value]',
      handler: this.handleConfig.bind(this),
    })

    this.commands.set('/close', {
      name: '/close',
      description: '关闭浏览器',
      handler: this.handleClose.bind(this),
    })

    this.commands.set('/exit', {
      name: '/exit',
      description: '退出程序',
      handler: this.handleExit.bind(this),
    })
  }

  private setupEventHandlers(): void {
    this.rl.on('line', this.handleInput.bind(this))
    this.rl.on('close', this.handleClose.bind(this))

    // 处理Ctrl+C
    process.on('SIGINT', this.handleExit.bind(this))
  }

  async start(): Promise<void> {
    console.log(chalk.cyan.bold('\n🎮 Freedom Interactive Mode'))
    console.log(chalk.gray('Type /help to see available commands\n'))

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
      console.log(chalk.red('❌ 命令必须以 / 开头，输入 /help 查看可用命令'))
      this.rl.prompt()
      return
    }

    // 解析命令和参数
    const parts = trimmed.split(/\s+/)
    const commandName = parts[0]
    const args = parts.slice(1)

    const command = this.commands.get(commandName)
    if (!command) {
      console.log(chalk.red(`❌ 未知命令: ${commandName}，输入 /help 查看可用命令`))
      this.rl.prompt()
      return
    }

    try {
      await command.handler(args)
    }
    catch (error) {
      console.log(chalk.red(`❌ 命令执行失败: ${error instanceof Error ? error.message : String(error)}`))
    }

    this.rl.prompt()
  }

  private async handleHelp(_args: string[]): Promise<void> {
    console.log(chalk.cyan.bold('\n📖 可用的斜杠命令:'))

    for (const [name, command] of this.commands) {
      console.log(chalk.white(`  ${name.padEnd(12)} - ${command.description}`))
    }

    console.log(chalk.gray('\n💡 提示:'))
    console.log(chalk.gray('  - 所有命令都必须以 / 开头'))
    console.log(chalk.gray('  - 登录示例: /login username password'))
    console.log(chalk.gray('  - 不要在用户名密码中使用空格\n'))
  }

  private async handleLogin(args: string[]): Promise<void> {
    try {
      // 检查参数
      if (args.length < 2) {
        console.log(chalk.red('❌ 请提供用户名和密码'))
        console.log(chalk.gray('用法: /login <username> <password> [url]'))
        console.log(chalk.gray('示例: /login myuser mypass https://ys.mihoyo.com/cloud/'))
        return
      }

      // 解析参数
      const username = args[0]
      const password = args[1]
      const url = args[2] || 'https://ys.mihoyo.com/cloud/'

      const credentials: LoginCredentials = { username, password }

      console.log(chalk.blue('🚀 启动浏览器...'))

      // 启动浏览器
      this.browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      })

      this.page = await this.browser.newPage()

      // 创建登录自动化器
      this.loginAutomator = new LoginAutomator(this.page, {
        loginConfig: {
          gameUrl: url,
        },
      })

      // 监听登录进度
      this.loginAutomator.on('stateChanged', (newStatus: any) => {
        console.log(chalk.gray(`📊 ${newStatus.message} (${this.loginAutomator?.getProgress()}%)`))
      })

      console.log(chalk.blue('🔐 开始自动登录...'))
      const result = await this.loginAutomator.login(credentials, (progress) => {
        const bar = '█'.repeat(Math.floor(progress.progress / 5))
        const empty = '░'.repeat(20 - Math.floor(progress.progress / 5))
        console.log(`[${bar}${empty}] ${progress.progress.toFixed(1)}% - ${progress.message}`)
      })

      if (result.success) {
        console.log(chalk.green(`✅ 登录成功！耗时: ${(result.duration / 1000).toFixed(2)}秒`))

        globalStateManager.setState({
          isRunning: true,
          lastActivity: new Date(),
          sessionId: Date.now().toString(),
        })

        console.log(chalk.blue('🎮 游戏已登录，浏览器保持打开状态'))
      }
      else {
        console.log(chalk.red(`❌ 登录失败: ${result.message}`))
        if (result.error) {
          console.log(chalk.gray(`🔍 错误详情: ${result.error.message}`))
        }

        await this.cleanup()
      }
    }
    catch (error) {
      console.log(chalk.red(`💥 登录过程中发生错误: ${error instanceof Error ? error.message : String(error)}`))
      await this.cleanup()
    }
  }

  private async handleStatus(_args: string[]): Promise<void> {
    const state = globalStateManager.getState()

    console.log(chalk.cyan.bold('\n📊 系统状态:'))
    console.log(`  内存使用: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`)

    console.log(chalk.cyan.bold('\n🎮 游戏状态:'))
    console.log(`  运行状态: ${state.isRunning ? '🟢 运行中' : '🔴 未运行'}`)
    if (state.sessionId) {
      console.log(`  会话ID: ${state.sessionId}`)
    }
    if (state.lastActivity) {
      console.log(`  最后活动: ${state.lastActivity.toLocaleString()}`)
    }

    console.log(chalk.cyan.bold('\n🌐 浏览器状态:'))
    console.log(`  浏览器: ${this.browser ? '🟢 已连接' : '🔴 未连接'}`)
    console.log(`  页面: ${this.page ? '🟢 已打开' : '🔴 未打开'}`)
    console.log(`  自动化: ${this.loginAutomator ? '🟢 已初始化' : '🔴 未初始化'}`)
    console.log('')
  }

  private async handleConfig(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.cyan.bold('\n⚙️ 基本配置:'))
      console.log('  当前版本: v0.1.0')
      console.log('  登录URL: https://ys.mihoyo.com/cloud/')
      console.log('  浏览器模式: 可视化')
      console.log('')
    }
    else {
      console.log(chalk.gray('💡 提示: 配置管理功能正在开发中'))
    }
  }

  private async handleClose(_args: string[]): Promise<void> {
    await this.cleanup()
    console.log(chalk.yellow('🔒 浏览器已关闭'))
  }

  private async handleExit(_args: string[]): Promise<void> {
    console.log(chalk.yellow('\n👋 正在退出...'))
    await this.cleanup()
    this.rl.close()
    process.exit(0)
  }

  private async cleanup(): Promise<void> {
    if (this.loginAutomator) {
      await this.loginAutomator.dispose()
      this.loginAutomator = null
    }

    if (this.browser) {
      await this.browser.close()
      this.browser = null
      this.page = null
    }

    globalStateManager.setState({
      isRunning: false,
      lastActivity: new Date(),
    })
  }

  private async getPasswordInput(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      // 临时移除line事件监听器
      this.rl.removeAllListeners('line')

      // 隐藏密码输入
      process.stdout.write(prompt)
      process.stdin.setRawMode(true)
      process.stdin.resume()
      process.stdin.setEncoding('utf8')

      let password = ''
      const onData = (char: string) => {
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004': // Ctrl+D
            process.stdin.setRawMode(false)
            process.stdin.pause()
            process.stdin.off('data', onData)
            console.log()
            // 重新设置事件监听器
            this.rl.on('line', this.handleInput.bind(this))
            resolve(password)
            break
          case '\u0003': // Ctrl+C
            process.exit(1)
            break
          case '\u007F': // Backspace
            if (password.length > 0) {
              password = password.slice(0, -1)
              process.stdout.write('\b \b')
            }
            break
          default:
            password += char
            process.stdout.write('*')
            break
        }
      }

      process.stdin.on('data', onData)
    })
  }
}
