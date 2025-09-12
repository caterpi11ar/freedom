import type { Browser, Page } from 'playwright'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import * as readline from 'node:readline'
import { globalStateManager } from '@freedom/shared'
import { Command } from 'commander'
import { chromium } from 'playwright'

// 简化的账户配置
interface AccountInfo {
  id: string
  displayName: string
  gameUrl: string
  lastLoginTime: Date
  loginCount: number
}

// 配置管理器
class ConfigManager {
  private configDir: string
  private accountsFile: string
  private lastUsedFile: string

  constructor() {
    this.configDir = path.join(os.homedir(), '.freedom')
    this.accountsFile = path.join(this.configDir, 'accounts.json')
    this.lastUsedFile = path.join(this.configDir, 'last_used.txt')
  }

  async ensureConfigDir(): Promise<void> {
    try {
      await fs.access(this.configDir)
    }
    catch {
      await fs.mkdir(this.configDir, { recursive: true })
    }
  }

  async loadAccounts(): Promise<AccountInfo[]> {
    try {
      await this.ensureConfigDir()
      const data = await fs.readFile(this.accountsFile, 'utf-8')
      const accounts = JSON.parse(data, this.dateReviver)
      return Array.isArray(accounts) ? accounts : []
    }
    catch {
      return []
    }
  }

  async saveAccounts(accounts: AccountInfo[]): Promise<void> {
    await this.ensureConfigDir()
    await fs.writeFile(
      this.accountsFile,
      JSON.stringify(accounts, this.dateReplacer, 2),
      'utf-8',
    )
  }

  async getLastUsedAccountId(): Promise<string | null> {
    try {
      await this.ensureConfigDir()
      const data = await fs.readFile(this.lastUsedFile, 'utf-8')
      return data.trim() || null
    }
    catch {
      return null
    }
  }

  async setLastUsedAccountId(accountId: string): Promise<void> {
    await this.ensureConfigDir()
    await fs.writeFile(this.lastUsedFile, accountId, 'utf-8')
  }

  private dateReplacer(_key: string, value: any): any {
    return value instanceof Date ? value.toISOString() : value
  }

  private dateReviver(_key: string, value: any): any {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value)
    }
    return value
  }
}

const configManager = new ConfigManager()

export async function executeLogin(): Promise<void> {
  console.log('🎮 启动云游戏登录...')

  try {
    // 加载现有账户
    const accounts = await configManager.loadAccounts()
    const lastUsedId = await configManager.getLastUsedAccountId()

    let selectedAccount: AccountInfo | null = null

    // 如果有已保存的账户，显示选择列表
    if (accounts.length > 0) {
      console.log('\n📋 选择登录账户:')

      accounts.forEach((account, index) => {
        const isLastUsed = account.id === lastUsedId
        const marker = isLastUsed ? '🌟' : '  '
        const lastUsedText = isLastUsed ? ' (上次登录)' : ''

        console.log(`${marker} ${index + 1}. ${account.displayName}${lastUsedText}`)
        console.log(`     登录次数: ${account.loginCount} | 最后登录: ${account.lastLoginTime.toLocaleString()}`)
      })

      console.log(`   ${accounts.length + 1}. 新账户登录`)

      const choice = await getInput(`\n请选择 (1-${accounts.length + 1}): `)
      const index = Number.parseInt(choice)

      if (index >= 1 && index <= accounts.length) {
        selectedAccount = accounts[index - 1]
      }
      else if (index === accounts.length + 1) {
        selectedAccount = await createNewAccount()
      }
      else {
        console.log('❌ 无效选择')
        return
      }
    }
    else {
      // 首次使用，创建新账户
      console.log('📝 首次使用，请创建新账户')
      selectedAccount = await createNewAccount()
    }

    if (!selectedAccount) {
      console.log('❌ 账户创建失败')
      return
    }

    // 执行登录流程
    await performLogin(selectedAccount)
  }
  catch (error) {
    console.error('❌ 登录失败:', error)
    // 更新状态显示登录失败
    globalStateManager.setState({
      isRunning: false,
      lastActivity: new Date(),
    })
  }
}

async function createNewAccount(): Promise<AccountInfo | null> {
  const displayName = await getInput('请输入账户显示名称: ')
  if (!displayName.trim()) {
    console.log('❌ 显示名称不能为空')
    return null
  }

  const defaultUrl = 'https://ys.mihoyo.com/cloud/'
  const customUrl = await getInput(`游戏地址 (默认: ${defaultUrl}): `)
  const gameUrl = customUrl.trim() || defaultUrl

  return {
    id: `account_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    displayName: displayName.trim(),
    gameUrl,
    lastLoginTime: new Date(0), // 初始时间
    loginCount: 0,
  }
}

async function performLogin(account: AccountInfo): Promise<void> {
  let browser: Browser | null = null
  let page: Page | null = null

  try {
    console.log(`🚀 为账户 "${account.displayName}" 启动浏览器...`)

    browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    page = await browser.newPage()

    console.log(`🌐 导航到: ${account.gameUrl}`)
    await page.goto(account.gameUrl, { waitUntil: 'domcontentloaded' })

    console.log('\n✅ 请在浏览器中完成登录操作')
    console.log('💡 登录完成后，按回车键继续...')

    // 等待用户确认登录完成
    await getInput('登录完成后按回车键: ')

    // 保存登录状态
    console.log('💾 保存登录状态...')

    // 获取cookies
    const cookies = await page.context().cookies()

    // 获取本地存储
    const storageData = await page.evaluate(() => {
      const localStorage: Record<string, string> = {}
      const sessionStorage: Record<string, string> = {}

      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i)
          if (key)
            localStorage[key] = window.localStorage.getItem(key) || ''
        }
      }
      catch {}

      try {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i)
          if (key)
            sessionStorage[key] = window.sessionStorage.getItem(key) || ''
        }
      }
      catch {}

      return { localStorage, sessionStorage }
    })

    // 保存账户数据到指定位置
    await saveAccountData(account.id, cookies, storageData)

    // 更新账户信息
    account.lastLoginTime = new Date()
    account.loginCount += 1

    // 更新账户列表
    const accounts = await configManager.loadAccounts()
    const existingIndex = accounts.findIndex(a => a.id === account.id)

    if (existingIndex !== -1) {
      accounts[existingIndex] = account
    }
    else {
      accounts.push(account)
    }

    await configManager.saveAccounts(accounts)
    await configManager.setLastUsedAccountId(account.id)

    console.log('✅ 登录状态已保存！')
    console.log(`📊 ${account.displayName} - 登录次数: ${account.loginCount}`)

    // 更新全局状态
    globalStateManager.updateAccountsState({
      currentAccount: account.displayName,
      activeSessionCount: 1,
      totalAccounts: accounts.length,
    })
  }
  catch (error) {
    console.error('❌ 登录过程中发生错误:', error)
    throw error
  }
  finally {
    // 自动关闭浏览器
    if (browser) {
      console.log('🔄 关闭浏览器...')
      await browser.close()
    }
  }
}

async function saveAccountData(
  accountId: string,
  cookies: any[],
  storageData: { localStorage: Record<string, string>, sessionStorage: Record<string, string> },
): Promise<void> {
  const accountDir = path.join(os.homedir(), '.freedom', 'accounts', accountId)
  await fs.mkdir(accountDir, { recursive: true })

  // 保存cookies
  const cookiesFile = path.join(accountDir, 'cookies.json')
  await fs.writeFile(cookiesFile, JSON.stringify(cookies, null, 2))

  // 保存存储数据
  const storageFile = path.join(accountDir, 'storage.json')
  await fs.writeFile(storageFile, JSON.stringify(storageData, null, 2))
}

export const loginCommand = new Command('login')
  .description('云游戏登录')
  .action(executeLogin)

// 简单输入获取函数
async function getInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}
