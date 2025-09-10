import type { TestResult } from './TestHelper.js'
// 集成测试运行器 - 提供端到端测试支持
import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import { GameAutomationError } from '../utils/errors.js'
import { TestDataManager } from './TestDataManager.js'
import { TestHelper } from './TestHelper.js'

export interface IntegrationTestSuite {
  id: string
  name: string
  description?: string
  environment: string
  setup?: TestStep[]
  tests: IntegrationTest[]
  teardown?: TestStep[]
  parallel?: boolean
  timeout?: number
  retries?: number
}

export interface IntegrationTest {
  id: string
  name: string
  description?: string
  steps: TestStep[]
  assertions: TestAssertion[]
  timeout?: number
  dependencies?: string[]
  tags?: string[]
  data?: string[] // 数据集ID列表
}

export interface TestStep {
  type: 'action' | 'wait' | 'navigate' | 'click' | 'input' | 'screenshot' | 'script'
  target?: string
  value?: any
  timeout?: number
  description?: string
}

export interface TestAssertion {
  type: 'exists' | 'visible' | 'text' | 'value' | 'count' | 'custom'
  target?: string
  expected: any
  message?: string
}

export interface TestExecution {
  suiteId: string
  testId: string
  startTime: Date
  endTime?: Date
  status: 'running' | 'passed' | 'failed' | 'skipped'
  results: TestStepResult[]
  screenshots: string[]
  logs: string[]
  error?: string
}

export interface TestStepResult {
  step: TestStep
  status: 'passed' | 'failed' | 'skipped'
  duration: number
  output?: any
  error?: string
  screenshot?: string
}

export class IntegrationTestRunner {
  private testHelper: TestHelper
  private dataManager: TestDataManager
  private suites: Map<string, IntegrationTestSuite> = new Map()
  private executions: Map<string, TestExecution> = new Map()
  private testDir: string

  constructor() {
    this.testHelper = new TestHelper()
    this.dataManager = new TestDataManager()
    this.testDir = path.join(process.cwd(), '.freedom', 'integration-tests')
  }

  /**
   * 初始化集成测试运行器
   */
  async initialize(): Promise<void> {
    await mkdir(this.testDir, { recursive: true })
    await this.testHelper.initialize()
    await this.dataManager.initialize()

    // 创建默认测试套件
    await this.createDefaultTestSuites()

    console.log(chalk.green('🧪 Integration test runner initialized'))
  }

  /**
   * 创建测试套件
   */
  async createTestSuite(suite: Omit<IntegrationTestSuite, 'id'>): Promise<string> {
    const id = `suite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const testSuite: IntegrationTestSuite = { ...suite, id }

    this.suites.set(id, testSuite)

    // 保存到文件
    const suitePath = path.join(this.testDir, `${id}.json`)
    await writeFile(suitePath, JSON.stringify(testSuite, null, 2))

    console.log(chalk.green(`📋 Created test suite: ${suite.name}`))
    return id
  }

  /**
   * 加载测试套件
   */
  async loadTestSuite(suiteId: string): Promise<IntegrationTestSuite> {
    try {
      const suitePath = path.join(this.testDir, `${suiteId}.json`)
      const suiteContent = await readFile(suitePath, 'utf-8')
      const suite = JSON.parse(suiteContent)

      this.suites.set(suiteId, suite)
      return suite
    }
    catch (error) {
      throw new GameAutomationError(`Failed to load test suite: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 运行测试套件
   */
  async runTestSuite(suiteId: string): Promise<TestResult[]> {
    const suite = this.suites.get(suiteId) || await this.loadTestSuite(suiteId)

    console.log(chalk.blue(`🚀 Running test suite: ${suite.name}`))
    console.log(chalk.gray(`Environment: ${suite.environment}`))
    console.log(chalk.gray(`Tests: ${suite.tests.length}`))

    // 启动测试会话
    const sessionId = await this.testHelper.startTestSession(suite.environment)
    const results: TestResult[] = []

    try {
      // 执行setup步骤
      if (suite.setup) {
        console.log(chalk.blue('🔧 Running suite setup...'))
        await this.executeSteps(suite.setup, sessionId)
      }

      // 运行测试
      if (suite.parallel) {
        // 并行执行
        console.log(chalk.blue('⚡ Running tests in parallel...'))
        const testPromises = suite.tests.map(test => this.runSingleTest(test, sessionId, suite))
        const testResults = await Promise.allSettled(testPromises)

        for (const result of testResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value)
          }
          else {
            results.push({
              name: 'Unknown Test',
              status: 'fail',
              duration: 0,
              error: result.reason.message,
            })
          }
        }
      }
      else {
        // 顺序执行
        console.log(chalk.blue('🔄 Running tests sequentially...'))
        for (const test of suite.tests) {
          const result = await this.runSingleTest(test, sessionId, suite)
          results.push(result)
        }
      }

      // 执行teardown步骤
      if (suite.teardown) {
        console.log(chalk.blue('🧹 Running suite teardown...'))
        await this.executeSteps(suite.teardown, sessionId)
      }

      // 结束测试会话
      await this.testHelper.endTestSession(sessionId)

      // 生成报告
      await this.testHelper.generateReport(sessionId)

      const passed = results.filter(r => r.status === 'pass').length
      const failed = results.filter(r => r.status === 'fail').length
      const skipped = results.filter(r => r.status === 'skip').length

      console.log(chalk.green(`✅ Test suite completed`))
      console.log(chalk.white(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`))

      return results
    }
    catch (error) {
      console.error(chalk.red(`❌ Test suite failed: ${error instanceof Error ? error.message : 'Unknown error'}`))

      // 尝试清理
      try {
        await this.testHelper.endTestSession(sessionId)
      }
      catch {
        // 忽略清理错误
      }

      throw error
    }
  }

  /**
   * 运行单个测试
   */
  async runSingleTest(test: IntegrationTest, sessionId: string, suite: IntegrationTestSuite): Promise<TestResult> {
    const startTime = Date.now()
    const execution: TestExecution = {
      suiteId: suite.id,
      testId: test.id,
      startTime: new Date(),
      status: 'running',
      results: [],
      screenshots: [],
      logs: [],
    }

    this.executions.set(`${suite.id}_${test.id}`, execution)

    try {
      console.log(chalk.blue(`  🧪 Running: ${test.name}`))

      // 加载测试数据
      const testData = await this.loadTestData(test.data || [])

      // 执行测试步骤
      for (const step of test.steps) {
        const stepResult = await this.executeStep(step, sessionId, testData)
        execution.results.push(stepResult)

        if (stepResult.status === 'failed') {
          throw new Error(stepResult.error || 'Step execution failed')
        }
      }

      // 验证断言
      await this.verifyAssertions(test.assertions, sessionId)

      execution.status = 'passed'
      execution.endTime = new Date()

      const duration = Date.now() - startTime
      const result: TestResult = {
        name: test.name,
        status: 'pass',
        duration,
      }

      await this.testHelper.addTestResult(sessionId, result)
      console.log(chalk.green(`    ✅ ${test.name} (${duration}ms)`))

      return result
    }
    catch (error) {
      execution.status = 'failed'
      execution.endTime = new Date()
      execution.error = error instanceof Error ? error.message : 'Unknown error'

      const duration = Date.now() - startTime
      const result: TestResult = {
        name: test.name,
        status: 'fail',
        duration,
        error: execution.error,
      }

      await this.testHelper.addTestResult(sessionId, result)
      console.log(chalk.red(`    ❌ ${test.name}: ${execution.error}`))

      // 重试逻辑
      if (suite.retries && suite.retries > 0) {
        console.log(chalk.yellow(`    🔄 Retrying... (${suite.retries} attempts left)`))
        const retrySuite = { ...suite, retries: suite.retries - 1 }
        return this.runSingleTest(test, sessionId, retrySuite)
      }

      return result
    }
  }

  /**
   * 执行测试步骤
   */
  private async executeSteps(steps: TestStep[], sessionId: string): Promise<void> {
    for (const step of steps) {
      await this.executeStep(step, sessionId, {})
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(step: TestStep, sessionId: string, data: any): Promise<TestStepResult> {
    const startTime = Date.now()

    try {
      let output: any

      switch (step.type) {
        case 'wait':
          await this.sleep(step.value || 1000)
          output = `Waited ${step.value || 1000}ms`
          break

        case 'navigate':
          output = await this.navigate(step.target || step.value, sessionId)
          break

        case 'click':
          output = await this.click(step.target!, sessionId)
          break

        case 'input':
          output = await this.input(step.target!, step.value, sessionId)
          break

        case 'screenshot':
          output = await this.takeScreenshot(sessionId, step.description)
          break

        case 'script':
          output = await this.executeScript(step.value, data, sessionId)
          break

        case 'action':
          output = await this.executeAction(step.value, sessionId)
          break

        default:
          throw new Error(`Unknown step type: ${step.type}`)
      }

      const duration = Date.now() - startTime
      return {
        step,
        status: 'passed',
        duration,
        output,
      }
    }
    catch (error) {
      const duration = Date.now() - startTime
      return {
        step,
        status: 'failed',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * 验证断言
   */
  private async verifyAssertions(assertions: TestAssertion[], sessionId: string): Promise<void> {
    for (const assertion of assertions) {
      const result = await this.checkAssertion(assertion, sessionId)
      if (!result) {
        throw new Error(assertion.message || `Assertion failed: ${assertion.type}`)
      }
    }
  }

  /**
   * 检查单个断言
   */
  private async checkAssertion(assertion: TestAssertion, sessionId: string): Promise<boolean> {
    try {
      switch (assertion.type) {
        case 'exists':
          return await this.elementExists(assertion.target!, sessionId)
        case 'visible':
          return await this.elementVisible(assertion.target!, sessionId)
        case 'text':
          return await this.checkText(assertion.target!, assertion.expected, sessionId)
        case 'value':
          return await this.checkValue(assertion.target!, assertion.expected, sessionId)
        case 'count':
          return await this.checkCount(assertion.target!, assertion.expected, sessionId)
        case 'custom':
          return await this.executeCustomAssertion(assertion.expected, sessionId)
        default:
          return false
      }
    }
    catch {
      return false
    }
  }

  /**
   * 步骤执行方法 (模拟实现)
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private async navigate(url: string, sessionId: string): Promise<string> {
    await this.testHelper.addSessionLog(sessionId, `Navigating to: ${url}`)
    return `Navigated to ${url}`
  }

  private async click(selector: string, sessionId: string): Promise<string> {
    await this.testHelper.addSessionLog(sessionId, `Clicking element: ${selector}`)
    return `Clicked ${selector}`
  }

  private async input(selector: string, value: any, sessionId: string): Promise<string> {
    await this.testHelper.addSessionLog(sessionId, `Inputting to ${selector}: ${value}`)
    return `Input "${value}" to ${selector}`
  }

  private async takeScreenshot(sessionId: string, description?: string): Promise<string> {
    const screenshotId = await this.dataManager.createSnapshot(sessionId, 'screenshot', {
      description,
      timestamp: new Date(),
    })
    await this.testHelper.addSessionLog(sessionId, `Screenshot taken: ${screenshotId}`)
    return screenshotId
  }

  private async executeScript(script: string, data: any, sessionId: string): Promise<any> {
    await this.testHelper.addSessionLog(sessionId, `Executing script: ${script}`)
    // TODO: 实现脚本执行逻辑
    return { success: true, data }
  }

  private async executeAction(action: any, sessionId: string): Promise<any> {
    await this.testHelper.addSessionLog(sessionId, `Executing action: ${JSON.stringify(action)}`)
    // TODO: 实现动作执行逻辑
    return { success: true }
  }

  /**
   * 断言检查方法 (模拟实现)
   */
  private async elementExists(selector: string, sessionId: string): Promise<boolean> {
    await this.testHelper.addSessionLog(sessionId, `Checking if element exists: ${selector}`)
    return true // 模拟实现
  }

  private async elementVisible(selector: string, sessionId: string): Promise<boolean> {
    await this.testHelper.addSessionLog(sessionId, `Checking if element visible: ${selector}`)
    return true // 模拟实现
  }

  private async checkText(selector: string, expected: string, sessionId: string): Promise<boolean> {
    await this.testHelper.addSessionLog(sessionId, `Checking text of ${selector} equals "${expected}"`)
    return true // 模拟实现
  }

  private async checkValue(selector: string, expected: any, sessionId: string): Promise<boolean> {
    await this.testHelper.addSessionLog(sessionId, `Checking value of ${selector} equals ${expected}`)
    return true // 模拟实现
  }

  private async checkCount(selector: string, expected: number, sessionId: string): Promise<boolean> {
    await this.testHelper.addSessionLog(sessionId, `Checking count of ${selector} equals ${expected}`)
    return true // 模拟实现
  }

  private async executeCustomAssertion(assertion: any, sessionId: string): Promise<boolean> {
    await this.testHelper.addSessionLog(sessionId, `Executing custom assertion: ${JSON.stringify(assertion)}`)
    return true // 模拟实现
  }

  /**
   * 工具方法
   */
  private async loadTestData(datasetIds: string[]): Promise<any> {
    const data: any = {}

    for (const datasetId of datasetIds) {
      try {
        const dataset = await this.dataManager.loadDataSet(datasetId)
        data[dataset.name] = dataset.data
      }
      catch (error) {
        console.log(chalk.yellow(`⚠️  Failed to load dataset ${datasetId}: ${error instanceof Error ? error.message : 'Unknown error'}`))
      }
    }

    return data
  }

  private async createDefaultTestSuites(): Promise<void> {
    // 创建基础功能测试套件
    await this.createTestSuite({
      name: 'Basic Functionality',
      description: 'Test basic application functionality',
      environment: 'Testing',
      tests: [
        {
          id: 'test_login',
          name: 'User Login Test',
          description: 'Test user login functionality',
          steps: [
            { type: 'navigate', value: 'http://localhost:3000/login' },
            { type: 'input', target: '#username', value: 'testuser' },
            { type: 'input', target: '#password', value: 'testpass' },
            { type: 'click', target: '#login-button' },
            { type: 'wait', value: 2000 },
            { type: 'screenshot', description: 'After login' },
          ],
          assertions: [
            { type: 'exists', target: '#dashboard', expected: true },
            { type: 'text', target: '#welcome-message', expected: 'Welcome, testuser!' },
          ],
        },
        {
          id: 'test_config',
          name: 'Configuration Test',
          description: 'Test configuration management',
          steps: [
            { type: 'navigate', value: 'http://localhost:3000/settings' },
            { type: 'input', target: '#game-url', value: 'https://example.com' },
            { type: 'click', target: '#save-button' },
            { type: 'wait', value: 1000 },
          ],
          assertions: [
            { type: 'text', target: '#status-message', expected: 'Settings saved successfully' },
          ],
        },
      ],
      timeout: 60000,
      retries: 1,
    })

    // 创建性能测试套件
    await this.createTestSuite({
      name: 'Performance Tests',
      description: 'Test application performance',
      environment: 'Testing',
      tests: [
        {
          id: 'test_load_time',
          name: 'Page Load Time Test',
          description: 'Measure page load times',
          steps: [
            { type: 'navigate', value: 'http://localhost:3000' },
            { type: 'wait', value: 5000 },
            { type: 'screenshot', description: 'Page loaded' },
          ],
          assertions: [
            { type: 'custom', expected: { metric: 'loadTime', threshold: 3000 } },
          ],
          timeout: 10000,
        },
      ],
      parallel: true,
    })
  }

  /**
   * 公共接口
   */
  async listTestSuites(): Promise<IntegrationTestSuite[]> {
    return Array.from(this.suites.values())
  }

  async runTestByTag(tag: string): Promise<TestResult[]> {
    const allResults: TestResult[] = []

    for (const suite of this.suites.values()) {
      const taggedTests = suite.tests.filter(test => test.tags?.includes(tag))

      if (taggedTests.length > 0) {
        const testSuite = { ...suite, tests: taggedTests }
        const results = await this.runTestSuite(testSuite.id)
        allResults.push(...results)
      }
    }

    return allResults
  }

  async getTestExecution(suiteId: string, testId: string): Promise<TestExecution | undefined> {
    return this.executions.get(`${suiteId}_${testId}`)
  }

  async runTestScript(scriptPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const child = spawn('node', [scriptPath], {
        stdio: 'pipe',
        cwd: process.cwd(),
      })

      let output = ''
      let error = ''

      child.stdout?.on('data', (data) => {
        output += data.toString()
      })

      child.stderr?.on('data', (data) => {
        error += data.toString()
      })

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, output })
        }
        else {
          reject(new Error(`Script failed with code ${code}: ${error}`))
        }
      })

      child.on('error', (err) => {
        reject(err)
      })
    })
  }
}
