import type { FreedomConfig } from '@freedom/shared'
// 测试辅助工具 - 提供测试环境和工具支持
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import { GameAutomationError } from '../utils/errors.js'

export interface TestEnvironment {
  id: string
  name: string
  description?: string
  config: Partial<FreedomConfig>
  fixtures: TestFixture[]
  setup?: string[]
  teardown?: string[]
  isolated: boolean
}

export interface TestFixture {
  name: string
  type: 'config' | 'data' | 'mock' | 'script'
  content: any
  description?: string
}

export interface TestSession {
  id: string
  environment: string
  startTime: Date
  endTime?: Date
  results: TestResult[]
  logs: string[]
  status: 'running' | 'completed' | 'failed'
}

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip'
  duration: number
  error?: string
  screenshot?: string
  logs?: string[]
}

export interface MockConfig {
  name: string
  type: 'browser' | 'network' | 'filesystem' | 'api'
  enabled: boolean
  rules: MockRule[]
}

export interface MockRule {
  pattern: string
  response: any
  delay?: number
  error?: string
}

export class TestHelper {
  private testDir: string
  private environmentsDir: string
  private fixturesDir: string
  private sessionsDir: string
  private mocksDir: string

  constructor() {
    this.testDir = path.join(process.cwd(), '.freedom', 'testing')
    this.environmentsDir = path.join(this.testDir, 'environments')
    this.fixturesDir = path.join(this.testDir, 'fixtures')
    this.sessionsDir = path.join(this.testDir, 'sessions')
    this.mocksDir = path.join(this.testDir, 'mocks')
  }

  /**
   * 初始化测试系统
   */
  async initialize(): Promise<void> {
    await mkdir(this.testDir, { recursive: true })
    await mkdir(this.environmentsDir, { recursive: true })
    await mkdir(this.fixturesDir, { recursive: true })
    await mkdir(this.sessionsDir, { recursive: true })
    await mkdir(this.mocksDir, { recursive: true })

    // 创建默认测试环境
    await this.createDefaultEnvironments()

    // 创建基础fixtures
    await this.createBasicFixtures()

    console.log(chalk.green('🧪 Test system initialized'))
  }

  /**
   * 创建测试环境
   */
  async createEnvironment(environment: Omit<TestEnvironment, 'id'>): Promise<string> {
    const id = `env_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const env: TestEnvironment = { ...environment, id }

    const envPath = path.join(this.environmentsDir, `${id}.json`)
    await writeFile(envPath, JSON.stringify(env, null, 2))

    console.log(chalk.green(`📋 Created test environment: ${env.name}`))
    return id
  }

  /**
   * 加载测试环境
   */
  async loadEnvironment(environmentId: string): Promise<TestEnvironment> {
    try {
      const envPath = path.join(this.environmentsDir, `${environmentId}.json`)
      const envContent = await readFile(envPath, 'utf-8')
      return JSON.parse(envContent)
    }
    catch (error) {
      throw new GameAutomationError(`Failed to load test environment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 列出所有测试环境
   */
  async listEnvironments(): Promise<TestEnvironment[]> {
    try {
      const { readdir } = await import('node:fs/promises')
      const files = await readdir(this.environmentsDir)
      const environments: TestEnvironment[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const envPath = path.join(this.environmentsDir, file)
            const envContent = await readFile(envPath, 'utf-8')
            environments.push(JSON.parse(envContent))
          }
          catch {
            // 跳过损坏的文件
          }
        }
      }

      return environments
    }
    catch {
      return []
    }
  }

  /**
   * 启动测试会话
   */
  async startTestSession(environmentId: string): Promise<string> {
    const environment = await this.loadEnvironment(environmentId)
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const session: TestSession = {
      id: sessionId,
      environment: environmentId,
      startTime: new Date(),
      results: [],
      logs: [],
      status: 'running',
    }

    // 创建会话目录
    const sessionDir = path.join(this.sessionsDir, sessionId)
    await mkdir(sessionDir, { recursive: true })

    // 保存会话信息
    const sessionPath = path.join(sessionDir, 'session.json')
    await writeFile(sessionPath, JSON.stringify(session, null, 2))

    // 设置测试环境
    await this.setupTestEnvironment(environment, sessionDir)

    console.log(chalk.blue(`🚀 Started test session: ${sessionId}`))
    console.log(chalk.gray(`Environment: ${environment.name}`))

    return sessionId
  }

  /**
   * 结束测试会话
   */
  async endTestSession(sessionId: string): Promise<TestSession> {
    try {
      const sessionDir = path.join(this.sessionsDir, sessionId)
      const sessionPath = path.join(sessionDir, 'session.json')

      const sessionContent = await readFile(sessionPath, 'utf-8')
      const session: TestSession = JSON.parse(sessionContent)

      session.endTime = new Date()
      session.status = 'completed'

      // 清理测试环境
      await this.teardownTestEnvironment(sessionId)

      // 保存最终结果
      await writeFile(sessionPath, JSON.stringify(session, null, 2))

      console.log(chalk.green(`✅ Completed test session: ${sessionId}`))
      console.log(chalk.gray(`Duration: ${this.formatDuration(session.startTime, session.endTime)}`))
      console.log(chalk.gray(`Results: ${session.results.length} test(s)`))

      return session
    }
    catch (error) {
      throw new GameAutomationError(`Failed to end test session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 添加测试结果
   */
  async addTestResult(sessionId: string, result: TestResult): Promise<void> {
    try {
      const sessionDir = path.join(this.sessionsDir, sessionId)
      const sessionPath = path.join(sessionDir, 'session.json')

      const sessionContent = await readFile(sessionPath, 'utf-8')
      const session: TestSession = JSON.parse(sessionContent)

      session.results.push(result)
      await writeFile(sessionPath, JSON.stringify(session, null, 2))

      // 记录日志
      const logMessage = `Test "${result.name}": ${result.status.toUpperCase()} (${result.duration}ms)`
      await this.addSessionLog(sessionId, logMessage)

      if (result.status === 'fail') {
        console.log(chalk.red(`❌ ${result.name}: ${result.error || 'Unknown error'}`))
      }
      else if (result.status === 'pass') {
        console.log(chalk.green(`✅ ${result.name} (${result.duration}ms)`))
      }
      else {
        console.log(chalk.yellow(`⏭️  ${result.name}: Skipped`))
      }
    }
    catch (error) {
      throw new GameAutomationError(`Failed to add test result: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 添加会话日志
   */
  async addSessionLog(sessionId: string, message: string): Promise<void> {
    try {
      const sessionDir = path.join(this.sessionsDir, sessionId)
      const sessionPath = path.join(sessionDir, 'session.json')

      const sessionContent = await readFile(sessionPath, 'utf-8')
      const session: TestSession = JSON.parse(sessionContent)

      const timestamp = new Date().toISOString()
      session.logs.push(`[${timestamp}] ${message}`)

      await writeFile(sessionPath, JSON.stringify(session, null, 2))
    }
    catch {
      // 忽略日志错误
    }
  }

  /**
   * 创建测试fixture
   */
  async createFixture(fixture: TestFixture): Promise<void> {
    const fixturePath = path.join(this.fixturesDir, `${fixture.name}.json`)
    await writeFile(fixturePath, JSON.stringify(fixture, null, 2))
    console.log(chalk.green(`📦 Created fixture: ${fixture.name}`))
  }

  /**
   * 加载测试fixture
   */
  async loadFixture(name: string): Promise<TestFixture> {
    try {
      const fixturePath = path.join(this.fixturesDir, `${name}.json`)
      const fixtureContent = await readFile(fixturePath, 'utf-8')
      return JSON.parse(fixtureContent)
    }
    catch (error) {
      throw new GameAutomationError(`Failed to load fixture: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 创建Mock配置
   */
  async createMockConfig(mockConfig: MockConfig): Promise<void> {
    const mockPath = path.join(this.mocksDir, `${mockConfig.name}.json`)
    await writeFile(mockPath, JSON.stringify(mockConfig, null, 2))
    console.log(chalk.green(`🎭 Created mock config: ${mockConfig.name}`))
  }

  /**
   * 生成测试报告
   */
  async generateReport(sessionId: string): Promise<string> {
    try {
      const sessionDir = path.join(this.sessionsDir, sessionId)
      const sessionPath = path.join(sessionDir, 'session.json')

      const sessionContent = await readFile(sessionPath, 'utf-8')
      const session: TestSession = JSON.parse(sessionContent)

      const report = this.buildHtmlReport(session)
      const reportPath = path.join(sessionDir, 'report.html')
      await writeFile(reportPath, report)

      console.log(chalk.green(`📊 Generated test report: ${reportPath}`))
      return reportPath
    }
    catch (error) {
      throw new GameAutomationError(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 私有方法
   */
  private async createDefaultEnvironments(): Promise<void> {
    // 开发环境
    const devEnv: Omit<TestEnvironment, 'id'> = {
      name: 'Development',
      description: 'Standard development environment',
      config: {
        game: {
          url: 'https://ys.mihoyo.com/cloud/',
          region: 'cn',
          language: 'zh-CN',
          autoLogin: false,
        },
        automation: {
          headless: false,
          slowMo: 100,
          timeout: 30000,
          retryAttempts: 3,
          enableScreenshots: true,
          screenshotPath: './screenshots',
        },
        logging: {
          level: 'debug',
          maxSize: '10MB',
          maxFiles: 5,
          enableConsole: true,
        },
      },
      fixtures: [],
      isolated: false,
    }

    // 测试环境
    const testEnv: Omit<TestEnvironment, 'id'> = {
      name: 'Testing',
      description: 'Isolated testing environment with mocks',
      config: {
        game: {
          url: 'http://localhost:3000/mock-game',
          region: 'cn',
          language: 'zh-CN',
          autoLogin: false,
        },
        automation: {
          headless: true,
          slowMo: 0,
          timeout: 10000,
          retryAttempts: 1,
          enableScreenshots: false,
          screenshotPath: './screenshots',
        },
        logging: {
          level: 'warn',
          maxSize: '10MB',
          maxFiles: 5,
          enableConsole: false,
        },
      },
      fixtures: [
        { name: 'basic-config', type: 'config', content: {} },
        { name: 'mock-responses', type: 'mock', content: {} },
      ],
      setup: ['start-mock-server', 'clear-cache'],
      teardown: ['stop-mock-server', 'cleanup-logs'],
      isolated: true,
    }

    await this.createEnvironment(devEnv)
    await this.createEnvironment(testEnv)
  }

  private async createBasicFixtures(): Promise<void> {
    // 基础配置fixture
    await this.createFixture({
      name: 'basic-config',
      type: 'config',
      description: 'Basic configuration for testing',
      content: {
        game: {
          url: 'http://localhost:3000/test',
          region: 'test',
        },
        automation: {
          timeout: 5000,
        },
      },
    })

    // Mock响应fixture
    await this.createFixture({
      name: 'mock-responses',
      type: 'mock',
      description: 'Mock HTTP responses for testing',
      content: {
        '/api/login': { success: true, token: 'test-token' },
        '/api/status': { status: 'ready', version: '1.0.0' },
      },
    })
  }

  private async setupTestEnvironment(environment: TestEnvironment, sessionDir: string): Promise<void> {
    // 创建配置文件
    const configPath = path.join(sessionDir, 'config.json')
    await writeFile(configPath, JSON.stringify(environment.config, null, 2))

    // 设置fixtures
    for (const fixture of environment.fixtures) {
      try {
        const fixturePath = path.join(sessionDir, `${fixture.name}.json`)
        await writeFile(fixturePath, JSON.stringify(fixture.content, null, 2))
      }
      catch (error) {
        console.log(chalk.yellow(`⚠️  Failed to load fixture ${fixture.name}: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    // 执行setup脚本
    if (environment.setup) {
      for (const setupScript of environment.setup) {
        console.log(chalk.blue(`🔧 Running setup: ${setupScript}`))
        // TODO: 执行setup脚本
      }
    }
  }

  private async teardownTestEnvironment(sessionId: string): Promise<void> {
    // TODO: 执行清理逻辑
    console.log(chalk.blue(`🧹 Cleaning up test session: ${sessionId}`))
  }

  private formatDuration(start: Date, end: Date): string {
    const duration = end.getTime() - start.getTime()
    if (duration < 1000) {
      return `${duration}ms`
    }
    else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`
    }
    else {
      return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`
    }
  }

  private buildHtmlReport(session: TestSession): string {
    const passedTests = session.results.filter(r => r.status === 'pass').length
    const failedTests = session.results.filter(r => r.status === 'fail').length
    const skippedTests = session.results.filter(r => r.status === 'skip').length

    const duration = session.endTime
      ? this.formatDuration(session.startTime, session.endTime)
      : 'In progress'

    return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Report - ${session.id}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { padding: 10px; border-radius: 5px; text-align: center; }
        .stat.pass { background: #d4edda; color: #155724; }
        .stat.fail { background: #f8d7da; color: #721c24; }
        .stat.skip { background: #fff3cd; color: #856404; }
        .test-result { margin: 10px 0; padding: 10px; border-left: 4px solid #ccc; }
        .test-result.pass { border-color: #28a745; }
        .test-result.fail { border-color: #dc3545; }
        .test-result.skip { border-color: #ffc107; }
        .logs { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Test Report</h1>
        <p><strong>Session:</strong> ${session.id}</p>
        <p><strong>Environment:</strong> ${session.environment}</p>
        <p><strong>Started:</strong> ${session.startTime.toLocaleString()}</p>
        <p><strong>Duration:</strong> ${duration}</p>
    </div>
    
    <div class="stats">
        <div class="stat pass">
            <h3>${passedTests}</h3>
            <p>Passed</p>
        </div>
        <div class="stat fail">
            <h3>${failedTests}</h3>
            <p>Failed</p>
        </div>
        <div class="stat skip">
            <h3>${skippedTests}</h3>
            <p>Skipped</p>
        </div>
    </div>
    
    <h2>Test Results</h2>
    ${session.results.map(result => `
        <div class="test-result ${result.status}">
            <h4>${result.name}</h4>
            <p><strong>Status:</strong> ${result.status.toUpperCase()}</p>
            <p><strong>Duration:</strong> ${result.duration}ms</p>
            ${result.error ? `<p><strong>Error:</strong> ${result.error}</p>` : ''}
        </div>
    `).join('')}
    
    ${session.logs.length > 0
      ? `
        <div class="logs">
            <h2>Session Logs</h2>
            <pre>${session.logs.join('\n')}</pre>
        </div>
    `
      : ''}
</body>
</html>`
  }

  /**
   * 清理旧的测试会话
   */
  async cleanupSessions(olderThanDays: number = 7): Promise<void> {
    try {
      const { readdir } = await import('node:fs/promises')
      const sessions = await readdir(this.sessionsDir)
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)

      let cleaned = 0
      for (const sessionDir of sessions) {
        const sessionPath = path.join(this.sessionsDir, sessionDir)
        const stats = await stat(sessionPath)

        if (stats.isDirectory() && stats.mtime.getTime() < cutoffTime) {
          await rm(sessionPath, { recursive: true, force: true })
          cleaned++
        }
      }

      if (cleaned > 0) {
        console.log(chalk.green(`🧹 Cleaned up ${cleaned} old test session(s)`))
      }
    }
    catch (error) {
      console.log(chalk.yellow(`⚠️  Failed to cleanup sessions: ${error instanceof Error ? error.message : 'Unknown error'}`))
    }
  }
}
