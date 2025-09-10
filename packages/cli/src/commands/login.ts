// import type { LoginCredentials } from '@freedom/core'
import type { Browser, Page } from 'playwright'

import process from 'node:process'
import * as readline from 'node:readline'
// import { LoginAutomator } from '@freedom/core'

import { globalStateManager } from '@freedom/shared'
import { Command } from 'commander'
import { chromium } from 'playwright'

// Temporary type definitions until @freedom/core is fully implemented
interface LoginCredentials {
  username: string
  password: string
}

// Temporary placeholder until @freedom/core is fully implemented
class LoginAutomator {
  constructor(_page: any, _config: any) {}
  on(_event: string, _handler: (...args: any[]) => void) {}
  getProgress(): number { return 0 }
  async login(_credentials: LoginCredentials, _callback?: (progress: any) => void): Promise<any> {
    return { success: false, message: 'Core not implemented yet', duration: 0 }
  }

  async dispose() {}
}

export interface LoginCommandOptions {
  url?: string
  username?: string
  password?: string
  headless?: boolean
  timeout?: number
}

export async function executeLogin(options: LoginCommandOptions): Promise<void> {
  console.log('🎮 开始游戏登录...')

  let browser: Browser | null = null
  let page: Page | null = null

  try {
    // 获取登录凭据
    const credentials: LoginCredentials = {
      username: options.username || await getInput('请输入用户名: '),
      password: options.password || await getInput('请输入密码: ', true),
    }

    if (!credentials.username || !credentials.password) {
      console.log('❌ 用户名和密码不能为空')
      return
    }

    // 启动浏览器
    console.log('🚀 启动浏览器...')
    browser = await chromium.launch({
      headless: options.headless !== false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    page = await browser.newPage()

    // 创建登录自动化器
    const loginAutomator = new LoginAutomator(page, {
      loginConfig: {
        gameUrl: options.url || 'https://ys.mihoyo.com/cloud/',
        timeouts: {
          pageLoad: (Number.parseInt(String(options.timeout || '60')) * 1000),
          canvasReady: 15000,
          loginResponse: 10000,
          serverSelect: 5000,
        },
      },
      retryAttempts: 3,
      retryDelay: 2000,
    })

    // 监听登录进度
    loginAutomator.on('stateChanged', (newStatus: any) => {
      console.log(`📊 ${newStatus.message} (进度: ${loginAutomator.getProgress()}%)`)
    })

    // 执行登录
    console.log('🔐 开始自动登录...')
    const result = await loginAutomator.login(credentials, (progress: any) => {
      const progressBar = '='.repeat(Math.floor(progress.progress / 5))
      const emptyBar = '-'.repeat(20 - Math.floor(progress.progress / 5))
      console.log(`[${progressBar}${emptyBar}] ${progress.progress.toFixed(1)}% - ${progress.message}`)
    })

    if (result.success) {
      console.log(`✅ 登录成功！耗时: ${(result.duration / 1000).toFixed(2)}秒`)

      // 更新全局状态
      globalStateManager.setState({
        isRunning: true,
        lastActivity: new Date(),
        sessionId: Date.now().toString(),
      })

      // 保持页面打开一段时间以验证登录状态
      if (!options.headless) {
        console.log('🎮 游戏已登录，浏览器将保持打开状态')
        console.log('💡 按 Ctrl+C 退出并关闭浏览器')

        // 监听进程退出信号
        process.on('SIGINT', async () => {
          console.log('\n👋 正在关闭浏览器...')
          await loginAutomator.dispose()
          await browser?.close()
          process.exit(0)
        })

        // 保持进程运行
        await new Promise(() => {})
      }
    }
    else {
      console.log(`❌ 登录失败: ${result.message}`)
      if (result.error) {
        console.log(`🔍 错误详情: ${result.error.message}`)
      }

      // 更新全局状态
      globalStateManager.setState({
        isRunning: false,
        lastActivity: new Date(),
      })
    }

    // 清理资源
    await loginAutomator.dispose()
  }
  catch (error) {
    console.log(`💥 登录过程中发生错误: ${error instanceof Error ? error.message : String(error)}`)

    globalStateManager.setState({
      isRunning: false,
      lastActivity: new Date(),
    })
  }
  finally {
    // 如果是无头模式，总是关闭浏览器
    if (options.headless !== false && browser) {
      await browser.close()
    }
  }
}

export const loginCommand = new Command()
  .name('login')
  .description('自动登录游戏')
  .option('-u, --url <url>', '游戏URL', 'https://ys.mihoyo.com/cloud/')
  .option('--username <username>', '用户名')
  .option('--password <password>', '密码')
  .option('--headless', '无头模式运行', true)
  .option('-t, --timeout <timeout>', '超时时间(秒)', '60')
  .action(executeLogin)

// 简单的输入获取函数
async function getInput(prompt: string, isPassword = false): Promise<string> {
  // const readline = require('node:readline') // Already imported at top
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    if (isPassword) {
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
    }
    else {
      rl.question(prompt, (answer: string) => {
        rl.close()
        resolve(answer.trim())
      })
    }
  })
}
