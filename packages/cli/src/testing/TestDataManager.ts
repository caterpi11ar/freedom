// 测试数据管理器 - 管理测试数据的生成、存储和清理
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import { GameAutomationError } from '../utils/errors.js'

export interface TestDataSet {
  id: string
  name: string
  description?: string
  version: string
  tags: string[]
  data: Record<string, any>
  metadata: {
    created: Date
    updated: Date
    size: number
    checksum: string
  }
  schema?: TestDataSchema
}

export interface TestDataSchema {
  type: 'object' | 'array'
  properties?: Record<string, TestDataProperty>
  items?: TestDataProperty
  required?: string[]
}

export interface TestDataProperty {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array'
  format?: string
  enum?: any[]
  minimum?: number
  maximum?: number
  pattern?: string
  items?: TestDataProperty
  properties?: Record<string, TestDataProperty>
}

export interface DataGenerator {
  name: string
  type: 'user' | 'game' | 'config' | 'mock' | 'random'
  generate: (options?: any) => any
  schema?: TestDataSchema
}

export interface TestSnapshot {
  id: string
  sessionId: string
  timestamp: Date
  type: 'state' | 'screenshot' | 'data' | 'log'
  content: any
  size: number
}

export class TestDataManager {
  private dataDir: string
  private setsDir: string
  private snapshotsDir: string
  private templatesDir: string
  private generators: Map<string, DataGenerator> = new Map()

  constructor() {
    this.dataDir = path.join(process.cwd(), '.freedom', 'test-data')
    this.setsDir = path.join(this.dataDir, 'datasets')
    this.snapshotsDir = path.join(this.dataDir, 'snapshots')
    this.templatesDir = path.join(this.dataDir, 'templates')
  }

  /**
   * 初始化测试数据管理器
   */
  async initialize(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true })
    await mkdir(this.setsDir, { recursive: true })
    await mkdir(this.snapshotsDir, { recursive: true })
    await mkdir(this.templatesDir, { recursive: true })

    // 注册内置数据生成器
    this.registerBuiltinGenerators()

    // 创建默认数据集
    await this.createDefaultDataSets()

    console.log(chalk.green('📊 Test data manager initialized'))
  }

  /**
   * 创建测试数据集
   */
  async createDataSet(dataset: Omit<TestDataSet, 'id' | 'metadata'>): Promise<string> {
    const id = `dataset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const dataString = JSON.stringify(dataset.data)

    const dataSet: TestDataSet = {
      ...dataset,
      id,
      metadata: {
        created: new Date(),
        updated: new Date(),
        size: dataString.length,
        checksum: this.generateChecksum(dataString),
      },
    }

    const setPath = path.join(this.setsDir, `${id}.json`)
    await writeFile(setPath, JSON.stringify(dataSet, null, 2))

    console.log(chalk.green(`📦 Created test dataset: ${dataset.name}`))
    return id
  }

  /**
   * 加载测试数据集
   */
  async loadDataSet(datasetId: string): Promise<TestDataSet> {
    try {
      const setPath = path.join(this.setsDir, `${datasetId}.json`)
      const setContent = await readFile(setPath, 'utf-8')
      const dataset = JSON.parse(setContent)

      // 转换日期字段
      dataset.metadata.created = new Date(dataset.metadata.created)
      dataset.metadata.updated = new Date(dataset.metadata.updated)

      return dataset
    }
    catch (error) {
      throw new GameAutomationError(`Failed to load dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 更新测试数据集
   */
  async updateDataSet(datasetId: string, updates: Partial<Pick<TestDataSet, 'name' | 'description' | 'data' | 'tags' | 'schema'>>): Promise<void> {
    try {
      const dataset = await this.loadDataSet(datasetId)

      // 应用更新
      Object.assign(dataset, updates)
      dataset.metadata.updated = new Date()

      // 如果数据发生变化，重新计算元数据
      if (updates.data) {
        const dataString = JSON.stringify(updates.data)
        dataset.metadata.size = dataString.length
        dataset.metadata.checksum = this.generateChecksum(dataString)
      }

      const setPath = path.join(this.setsDir, `${datasetId}.json`)
      await writeFile(setPath, JSON.stringify(dataset, null, 2))

      console.log(chalk.green(`📝 Updated test dataset: ${dataset.name}`))
    }
    catch (error) {
      throw new GameAutomationError(`Failed to update dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 删除测试数据集
   */
  async deleteDataSet(datasetId: string): Promise<void> {
    try {
      const setPath = path.join(this.setsDir, `${datasetId}.json`)
      await rm(setPath)
      console.log(chalk.green(`🗑️  Deleted test dataset: ${datasetId}`))
    }
    catch (error) {
      throw new GameAutomationError(`Failed to delete dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 列出所有测试数据集
   */
  async listDataSets(tags?: string[]): Promise<TestDataSet[]> {
    try {
      const files = await readdir(this.setsDir)
      const datasets: TestDataSet[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const dataset = await this.loadDataSet(file.replace('.json', ''))

            // 过滤标签
            if (!tags || tags.some(tag => dataset.tags.includes(tag))) {
              datasets.push(dataset)
            }
          }
          catch {
            // 跳过损坏的文件
          }
        }
      }

      return datasets.sort((a, b) => b.metadata.updated.getTime() - a.metadata.updated.getTime())
    }
    catch {
      return []
    }
  }

  /**
   * 生成测试数据
   */
  async generateData(generatorName: string, options?: any): Promise<any> {
    const generator = this.generators.get(generatorName)
    if (!generator) {
      throw new GameAutomationError(`Data generator not found: ${generatorName}`)
    }

    try {
      const data = generator.generate(options)
      console.log(chalk.blue(`🎲 Generated test data using: ${generatorName}`))
      return data
    }
    catch (error) {
      throw new GameAutomationError(`Failed to generate data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 注册数据生成器
   */
  registerGenerator(generator: DataGenerator): void {
    this.generators.set(generator.name, generator)
    console.log(chalk.green(`🔧 Registered data generator: ${generator.name}`))
  }

  /**
   * 创建快照
   */
  async createSnapshot(sessionId: string, type: TestSnapshot['type'], content: any): Promise<string> {
    const id = `snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const contentString = typeof content === 'string' ? content : JSON.stringify(content)

    const snapshot: TestSnapshot = {
      id,
      sessionId,
      timestamp: new Date(),
      type,
      content,
      size: contentString.length,
    }

    const snapshotPath = path.join(this.snapshotsDir, `${id}.json`)
    await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2))

    console.log(chalk.blue(`📸 Created snapshot: ${type} (${snapshot.size} bytes)`))
    return id
  }

  /**
   * 加载快照
   */
  async loadSnapshot(snapshotId: string): Promise<TestSnapshot> {
    try {
      const snapshotPath = path.join(this.snapshotsDir, `${snapshotId}.json`)
      const snapshotContent = await readFile(snapshotPath, 'utf-8')
      const snapshot = JSON.parse(snapshotContent)

      snapshot.timestamp = new Date(snapshot.timestamp)
      return snapshot
    }
    catch (error) {
      throw new GameAutomationError(`Failed to load snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 列出会话快照
   */
  async listSnapshots(sessionId?: string): Promise<TestSnapshot[]> {
    try {
      const files = await readdir(this.snapshotsDir)
      const snapshots: TestSnapshot[] = []

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const snapshot = await this.loadSnapshot(file.replace('.json', ''))

            if (!sessionId || snapshot.sessionId === sessionId) {
              snapshots.push(snapshot)
            }
          }
          catch {
            // 跳过损坏的文件
          }
        }
      }

      return snapshots.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    }
    catch {
      return []
    }
  }

  /**
   * 验证数据集
   */
  async validateDataSet(datasetId: string): Promise<{ valid: boolean, errors: string[] }> {
    try {
      const dataset = await this.loadDataSet(datasetId)
      const errors: string[] = []

      // 检查数据完整性
      const dataString = JSON.stringify(dataset.data)
      const currentChecksum = this.generateChecksum(dataString)

      if (currentChecksum !== dataset.metadata.checksum) {
        errors.push('Data integrity check failed - checksum mismatch')
      }

      // 检查大小
      if (dataString.length !== dataset.metadata.size) {
        errors.push('Data size mismatch')
      }

      // 如果有schema，验证数据结构
      if (dataset.schema) {
        const validationErrors = this.validateDataAgainstSchema(dataset.data, dataset.schema)
        errors.push(...validationErrors)
      }

      return {
        valid: errors.length === 0,
        errors,
      }
    }
    catch (error) {
      return {
        valid: false,
        errors: [`Failed to validate dataset: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    }
  }

  /**
   * 导出数据集
   */
  async exportDataSet(datasetId: string, format: 'json' | 'csv' | 'yaml' = 'json'): Promise<string> {
    try {
      const dataset = await this.loadDataSet(datasetId)
      const exportDir = path.join(this.dataDir, 'exports')
      await mkdir(exportDir, { recursive: true })

      let content: string
      let extension: string

      switch (format) {
        case 'json':
          content = JSON.stringify(dataset, null, 2)
          extension = 'json'
          break
        case 'csv':
          content = this.convertToCSV(dataset.data)
          extension = 'csv'
          break
        case 'yaml':
          content = this.convertToYAML(dataset.data)
          extension = 'yaml'
          break
        default:
          throw new GameAutomationError(`Unsupported export format: ${format}`)
      }

      const exportPath = path.join(exportDir, `${dataset.name}_${Date.now()}.${extension}`)
      await writeFile(exportPath, content)

      console.log(chalk.green(`📤 Exported dataset to: ${exportPath}`))
      return exportPath
    }
    catch (error) {
      throw new GameAutomationError(`Failed to export dataset: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 清理过期数据
   */
  async cleanupExpiredData(olderThanDays: number = 30): Promise<void> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000)
    let cleaned = 0

    // 清理快照
    try {
      const snapshots = await this.listSnapshots()
      for (const snapshot of snapshots) {
        if (snapshot.timestamp.getTime() < cutoffTime) {
          const snapshotPath = path.join(this.snapshotsDir, `${snapshot.id}.json`)
          await rm(snapshotPath)
          cleaned++
        }
      }
    }
    catch {
      // 忽略清理错误
    }

    if (cleaned > 0) {
      console.log(chalk.green(`🧹 Cleaned up ${cleaned} expired snapshot(s)`))
    }
  }

  /**
   * 私有方法
   */
  private registerBuiltinGenerators(): void {
    // 用户数据生成器
    this.registerGenerator({
      name: 'user-data',
      type: 'user',
      generate: (options = {}) => ({
        username: options.username || `user_${Math.random().toString(36).substr(2, 9)}`,
        email: options.email || `user${Math.floor(Math.random() * 1000)}@example.com`,
        password: options.password || Math.random().toString(36).substr(2, 12),
        profile: {
          level: Math.floor(Math.random() * 60) + 1,
          region: options.region || 'asia',
          preferredLanguage: options.language || 'zh-CN',
        },
      }),
    })

    // 游戏状态生成器
    this.registerGenerator({
      name: 'game-state',
      type: 'game',
      generate: (options = {}) => ({
        player: {
          uid: options.uid || Math.floor(Math.random() * 900000000) + 100000000,
          level: options.level || Math.floor(Math.random() * 60) + 1,
          worldLevel: Math.floor(Math.random() * 8) + 1,
        },
        session: {
          connected: true,
          serverTime: new Date().toISOString(),
          ping: Math.floor(Math.random() * 100) + 20,
        },
        inventory: {
          primogems: Math.floor(Math.random() * 10000),
          resin: Math.floor(Math.random() * 160),
          mora: Math.floor(Math.random() * 1000000),
        },
      }),
    })

    // 配置数据生成器
    this.registerGenerator({
      name: 'config-data',
      type: 'config',
      generate: (options = {}) => ({
        game: {
          url: options.gameUrl || 'https://ys.mihoyo.com/cloud/',
          region: options.region || 'asia',
          headless: options.headless ?? true,
        },
        automation: {
          timeout: options.timeout || 30000,
          retry: {
            count: options.retryCount || 3,
            delay: options.retryDelay || 1000,
          },
          screenshots: options.screenshots ?? false,
        },
        logging: {
          level: options.logLevel || 'info',
          console: options.console ?? true,
          file: options.logFile ?? true,
        },
      }),
    })

    // Mock数据生成器
    this.registerGenerator({
      name: 'mock-responses',
      type: 'mock',
      generate: (options = {}) => ({
        '/api/login': {
          success: true,
          token: `mock_token_${Math.random().toString(36).substr(2)}`,
          user: { id: Math.floor(Math.random() * 1000), username: 'test_user' },
        },
        '/api/status': {
          status: 'ready',
          version: options.version || '1.0.0',
          timestamp: new Date().toISOString(),
        },
        '/api/config': {
          settings: this.generators.get('config-data')?.generate(options) || {},
        },
      }),
    })
  }

  private async createDefaultDataSets(): Promise<void> {
    // 创建用户测试数据集
    await this.createDataSet({
      name: 'Test Users',
      description: 'Sample user accounts for testing',
      version: '1.0.0',
      tags: ['users', 'auth', 'testing'],
      data: {
        users: [
          await this.generateData('user-data', { username: 'testuser1' }),
          await this.generateData('user-data', { username: 'testuser2' }),
          await this.generateData('user-data', { username: 'admin' }),
        ],
      },
    })

    // 创建游戏状态数据集
    await this.createDataSet({
      name: 'Game States',
      description: 'Various game states for testing',
      version: '1.0.0',
      tags: ['game', 'state', 'testing'],
      data: {
        states: [
          await this.generateData('game-state', { level: 1 }),
          await this.generateData('game-state', { level: 30 }),
          await this.generateData('game-state', { level: 60 }),
        ],
      },
    })
  }

  private generateChecksum(data: string): string {
    // 简单的checksum实现
    let hash = 0
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return hash.toString(16)
  }

  private validateDataAgainstSchema(data: any, schema: TestDataSchema): string[] {
    const errors: string[] = []

    // 简单的schema验证实现
    if (schema.type === 'object' && typeof data !== 'object') {
      errors.push('Data should be an object')
    }
    else if (schema.type === 'array' && !Array.isArray(data)) {
      errors.push('Data should be an array')
    }

    // TODO: 实现更完整的schema验证

    return errors
  }

  private convertToCSV(data: any): string {
    // 简单的JSON到CSV转换
    if (Array.isArray(data)) {
      if (data.length === 0)
        return ''

      const headers = Object.keys(data[0])
      const csvRows = [headers.join(',')]

      for (const row of data) {
        const values = headers.map((header) => {
          const value = row[header]
          return typeof value === 'string' ? `"${value}"` : String(value)
        })
        csvRows.push(values.join(','))
      }

      return csvRows.join('\n')
    }
    else {
      return Object.entries(data).map(([key, value]) => `${key},${value}`).join('\n')
    }
  }

  private convertToYAML(data: any): string {
    // 简单的JSON到YAML转换
    const yamlify = (obj: any, indent: number = 0): string => {
      const spaces = '  '.repeat(indent)

      if (Array.isArray(obj)) {
        return obj.map(item => `${spaces}- ${yamlify(item, 0)}`).join('\n')
      }
      else if (typeof obj === 'object' && obj !== null) {
        return Object.entries(obj)
          .map(([key, value]) => `${spaces}${key}: ${yamlify(value, indent + 1)}`)
          .join('\n')
      }
      else {
        return String(obj)
      }
    }

    return yamlify(data)
  }
}
