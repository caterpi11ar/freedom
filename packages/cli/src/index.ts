#!/usr/bin/env node

import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import chalk from 'chalk'
import { Command } from 'commander'

import { configCommand } from './commands/config'
import { doctorCommand } from './commands/doctor'
import { logCommand } from './commands/log'
import { loginCommand } from './commands/login'
import { logoutCommand } from './commands/logout'
import { restartCommand } from './commands/restart'
import { scriptCommand } from './commands/scripts'
import { startCommand } from './commands/start'
import { statusCommand } from './commands/status'
import { stopCommand } from './commands/stop'
import { taskCommand } from './commands/task'
import { generatePrompt } from './display/prompt'
import { CLIStateBridge } from './state/bridge'
import { createTimeTracker } from './utils/time'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const require = createRequire(import.meta.url)

// 读取 package.json 获取版本信息
const packagePath = join(__dirname, '..', 'package.json')
const packageJson = require(packagePath)

const program = new Command()

program
  .name('freedom')
  .description(chalk.cyan('🎮 Freedom - 云原神自动化工具'))
  .version(packageJson.version, '-v, --version', '显示版本号')
  .helpOption('-h, --help', '显示帮助信息')

// 添加全局选项
program
  .option('--verbose', '显示详细日志')
  .option('--config <path>', '指定配置文件路径')
  .option('--no-color', '禁用彩色输出')

// 注册命令 (按斜杠命令规范顺序)
program.addCommand(loginCommand)
program.addCommand(logoutCommand)
program.addCommand(logCommand)
program.addCommand(doctorCommand)
program.addCommand(configCommand)
program.addCommand(scriptCommand)
program.addCommand(taskCommand)
program.addCommand(startCommand)
program.addCommand(stopCommand)
program.addCommand(restartCommand)
program.addCommand(statusCommand)

// 添加 help 命令别名
const helpCommand = new Command('help')
  .description('📖 获取使用帮助')
  .argument('[command]', '获取特定命令的帮助')
  .action((command) => {
    if (command) {
      const cmd = program.commands.find(c => c.name() === command)
      if (cmd) {
        cmd.help()
      }
      else {
        console.error(chalk.red(`❌ 未找到命令: ${command}`))
        program.help()
      }
    }
    else {
      program.help()
    }
  })
program.addCommand(helpCommand)

// 处理未知命令
program.on('command:*', (operands) => {
  console.error(chalk.red(`❌ 未知命令: ${operands[0]}`))
  console.log(chalk.yellow('💡 运行 "freedom --help" 查看可用命令'))
  process.exit(1)
})

// 交互式模式处理函数
async function startInteractiveMode(): Promise<void> {
  const timeTracker = createTimeTracker()
  let isCommandMode = true // true: 等待命令输入, false: 命令正在执行中

  console.log(chalk.cyan('🎮 欢迎使用 Freedom 交互模式'))
  console.log(chalk.gray('💡 输入命令或 "/help" 获取帮助，输入 "/exit" 退出'))
  console.log()

  // 获取初始状态生成提示符
  const initialState = CLIStateBridge.getState()
  const initialPrompt = generatePrompt(initialState)

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: initialPrompt,
  })

  // 订阅状态变化，动态更新提示符
  const unsubscribe = CLIStateBridge.subscribe((state) => {
    if (isCommandMode) {
      const newPrompt = generatePrompt(state)
      rl.setPrompt(newPrompt)
    }
  })

  // 显示提示符
  rl.prompt()

  rl.on('line', async (input) => {
    // 如果不在命令模式，忽略所有输入（让正在执行的命令处理）
    if (!isCommandMode) {
      return
    }

    const trimmed = input.trim()

    if (!trimmed) {
      rl.prompt()
      return
    }

    // 处理退出命令
    if (trimmed === '/exit') {
      rl.close()
      return
    }

    // 处理帮助命令
    if (trimmed === '/help') {
      showInteractiveHelp()
      rl.prompt()
      return
    }

    // 如果不是以/开头的命令，提示用户
    if (!trimmed.startsWith('/')) {
      console.error(chalk.red('❌ 命令必须以 "/" 开头'))
      console.log(chalk.yellow('💡 输入 "/help" 查看可用命令'))
      rl.prompt()
      return
    }

    // 解析并执行命令
    try {
      isCommandMode = false // 进入命令执行模式

      // 临时关闭主readline，让命令自己处理输入
      rl.pause()

      await executeCommand(trimmed)
    }
    catch (error) {
      console.error(chalk.red('❌ 命令执行失败:'), error instanceof Error ? error.message : error)
    }
    finally {
      // 命令执行完毕，恢复命令模式
      isCommandMode = true
      rl.resume()
      rl.prompt()
    }
  })

  rl.on('close', () => {
    // 取消状态订阅
    unsubscribe()

    const duration = timeTracker.getFormattedDuration()
    console.log(chalk.yellow(`👋 再见！本次使用时长: ${duration}`))
    process.exit(0)
  })

  // 优雅退出处理
  process.on('SIGINT', () => {
    rl.close()
  })
}

// 显示交互模式帮助
function showInteractiveHelp(): void {
  console.log(chalk.cyan('🎮 Freedom - 云原神自动化工具'))
  console.log()
  console.log(chalk.yellow('可用命令:'))

  const commands = [
    { name: '/login', desc: '登录账号' },
    { name: '/logout', desc: '登出账号' },
    { name: '/start', desc: '开始自动化任务' },
    { name: '/stop', desc: '停止任务' },
    { name: '/restart', desc: '重启任务' },
    { name: '/log', desc: '查看日志' },
    { name: '/config', desc: '配置管理' },
    { name: '/doctor', desc: '环境检查' },
    { name: '/script', desc: '脚本管理' },
    { name: '/task', desc: '任务管理' },
    { name: '/status', desc: '显示系统状态' },
    { name: '/help', desc: '显示此帮助信息' },
    { name: '/exit', desc: '退出交互模式' },
  ]

  commands.forEach((cmd) => {
    console.log(`  ${chalk.green(cmd.name.padEnd(8))} ${chalk.gray(cmd.desc)}`)
  })
  console.log()
}

// 执行交互式命令
async function executeCommand(input: string): Promise<void> {
  // 处理斜杠命令：将 /command 转换为 command 来匹配 commander
  const parts = input.split(' ').filter(arg => arg.trim())
  if (parts[0]?.startsWith('/')) {
    parts[0] = parts[0].slice(1) // 移除首个命令的斜杠
  }
  const args = ['node', 'freedom', ...parts]

  // 创建新的程序实例来避免状态污染
  const interactiveProgram = new Command()

  interactiveProgram
    .name('freedom')
    .description(chalk.cyan('🎮 Freedom - 云原神自动化工具'))
    .version(packageJson.version, '-v, --version', '显示版本号')
    .helpOption('-h, --help', '显示帮助信息')
    .exitOverride() // 防止 commander 退出进程

  // 添加全局选项
  interactiveProgram
    .option('--verbose', '显示详细日志')
    .option('--config <path>', '指定配置文件路径')
    .option('--no-color', '禁用彩色输出')

  // 注册命令
  interactiveProgram.addCommand(loginCommand)
  interactiveProgram.addCommand(logoutCommand)
  interactiveProgram.addCommand(logCommand)
  interactiveProgram.addCommand(doctorCommand)
  interactiveProgram.addCommand(configCommand)
  interactiveProgram.addCommand(scriptCommand)
  interactiveProgram.addCommand(taskCommand)
  interactiveProgram.addCommand(startCommand)
  interactiveProgram.addCommand(stopCommand)
  interactiveProgram.addCommand(restartCommand)
  interactiveProgram.addCommand(statusCommand)
  interactiveProgram.addCommand(helpCommand)

  // 处理未知命令
  interactiveProgram.on('command:*', (operands) => {
    console.error(chalk.red(`❌ 未知命令: ${operands[0]}`))
    console.log(chalk.yellow('💡 输入 "/help" 查看可用命令'))
  })

  try {
    await interactiveProgram.parseAsync(args)
  }
  catch (error) {
    // 忽略 commander 的退出错误，继续交互
    if (error instanceof Error && error.name !== 'CommanderError') {
      throw error
    }
  }
}

// 处理无参数情况 - 启动交互模式
if (process.argv.length === 2) {
  startInteractiveMode()
}
else {
  // 解析命令行参数
  program.parse()
}

// 错误处理
process.on('unhandledRejection', (reason) => {
  console.error(chalk.red('❌ 未处理的 Promise 拒绝:'), reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error(chalk.red('❌ 未捕获的异常:'), error.message)
  process.exit(1)
})
