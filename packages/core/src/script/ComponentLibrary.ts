import type { ActionBlock, ActionCategory } from './ScriptBuilder'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

// 组件库类型定义
export interface ComponentLibrary {
  id: string
  name: string
  description: string
  version: string
  author: string
  tags: string[]
  category: ComponentCategory
  components: ActionBlock[]
  dependencies: string[]
  createdAt: Date
  updatedAt: Date
  isSystem: boolean
}

export type ComponentCategory
  = | 'game-specific' | 'ui-automation' | 'image-processing' | 'data-processing'
    | 'utility' | 'third-party' | 'community' | 'custom'

export interface ComponentTemplate {
  id: string
  name: string
  description: string
  category: ActionCategory
  template: ActionBlock
  usage: ComponentUsage
  examples: ComponentExample[]
}

export interface ComponentUsage {
  description: string
  parameters: ParameterDoc[]
  returns: ReturnDoc[]
  notes: string[]
  warnings: string[]
}

export interface ParameterDoc {
  name: string
  type: string
  required: boolean
  description: string
  example?: any
}

export interface ReturnDoc {
  name: string
  type: string
  description: string
}

export interface ComponentExample {
  name: string
  description: string
  code: string
  inputs: { [key: string]: any }
  expectedOutput?: any
}

export interface ComponentFilter {
  category?: ComponentCategory
  tags?: string[]
  author?: string
  searchText?: string
  isSystem?: boolean
  gameVersion?: string
}

export interface ComponentStats {
  totalComponents: number
  systemComponents: number
  userComponents: number
  categories: { [key: string]: number }
  tags: { [key: string]: number }
  lastModified?: Date
}

// 组件库管理器
export class ComponentLibraryManager {
  private librariesDir: string
  private templatesDir: string
  private libraries: Map<string, ComponentLibrary> = new Map()
  private templates: Map<string, ComponentTemplate> = new Map()
  private isInitialized = false

  constructor() {
    const configDir = path.join(os.homedir(), '.freedom')
    this.librariesDir = path.join(configDir, 'component-libraries')
    this.templatesDir = path.join(configDir, 'component-templates')
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    await this.ensureDirectories()
    await this.loadLibraries()
    await this.loadTemplates()
    await this.ensureDefaultLibraries()

    this.isInitialized = true
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.access(this.librariesDir)
    }
    catch {
      await fs.mkdir(this.librariesDir, { recursive: true })
    }

    try {
      await fs.access(this.templatesDir)
    }
    catch {
      await fs.mkdir(this.templatesDir, { recursive: true })
    }
  }

  private async loadLibraries(): Promise<void> {
    try {
      const files = await fs.readdir(this.librariesDir)
      const jsonFiles = files.filter(file => file.endsWith('.json'))

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.librariesDir, file)
          const data = await fs.readFile(filePath, 'utf-8')
          const library = JSON.parse(data, this.dateReviver) as ComponentLibrary

          this.libraries.set(library.id, library)
        }
        catch (error) {
          console.warn(`Failed to load component library ${file}:`, error)
        }
      }
    }
    catch (error) {
      console.warn('Failed to load component libraries:', error)
    }
  }

  private async loadTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.templatesDir)
      const jsonFiles = files.filter(file => file.endsWith('.json'))

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.templatesDir, file)
          const data = await fs.readFile(filePath, 'utf-8')
          const template = JSON.parse(data, this.dateReviver) as ComponentTemplate

          this.templates.set(template.id, template)
        }
        catch (error) {
          console.warn(`Failed to load component template ${file}:`, error)
        }
      }
    }
    catch (error) {
      console.warn('Failed to load component templates:', error)
    }
  }

  private async ensureDefaultLibraries(): Promise<void> {
    if (this.libraries.size === 0) {
      await this.createDefaultLibraries()
    }
  }

  private async createDefaultLibraries(): Promise<void> {
    // 原神专用组件库
    const genshinLibrary: ComponentLibrary = {
      id: 'genshin-core',
      name: '原神核心组件库',
      description: '原神游戏专用的核心自动化组件',
      version: '1.0.0',
      author: 'system',
      tags: ['genshin', 'game-specific', 'core'],
      category: 'game-specific',
      components: [
        {
          id: 'genshin-login',
          type: 'interaction',
          name: '原神登录',
          description: '自动登录原神游戏',
          icon: '🎮',
          category: 'game-control',
          tags: ['genshin', 'login', 'game-control'],
          inputs: [
            {
              id: 'account',
              name: '账户',
              type: 'string',
              required: true,
              description: '登录账户信息',
            },
            {
              id: 'server',
              name: '服务器',
              type: 'enum',
              required: true,
              defaultValue: 'cn',
              description: '服务器类型',
              enumOptions: ['cn', 'global'],
            },
          ],
          outputs: [
            {
              id: 'success',
              name: '登录成功',
              type: 'boolean',
              description: '是否成功登录',
            },
            {
              id: 'uid',
              name: '用户ID',
              type: 'string',
              description: '游戏用户ID',
            },
          ],
          config: {
            canHaveChildren: false,
            executionTimeout: 30000,
            retryCount: 3,
            breakOnError: true,
          },
          validation: {
            required: ['account', 'server'],
          },
        },
        {
          id: 'daily-commissions',
          type: 'function',
          name: '每日委托',
          description: '自动完成每日委托任务',
          icon: '📝',
          category: 'game-control',
          tags: ['daily', 'commission', 'game-control'],
          inputs: [
            {
              id: 'commissionCount',
              name: '委托数量',
              type: 'number',
              required: false,
              defaultValue: 4,
              description: '要完成的委托数量',
              validation: { min: 1, max: 4 },
            },
            {
              id: 'autoNavigate',
              name: '自动导航',
              type: 'boolean',
              required: false,
              defaultValue: true,
              description: '是否自动导航到委托位置',
            },
          ],
          outputs: [
            {
              id: 'completed',
              name: '完成数量',
              type: 'number',
              description: '实际完成的委托数量',
            },
            {
              id: 'rewards',
              name: '获得奖励',
              type: 'any',
              description: '获得的奖励信息',
            },
          ],
          config: {
            canHaveChildren: true,
            executionTimeout: 1800000, // 30分钟
            retryCount: 1,
            breakOnError: false,
          },
          validation: {
            required: [],
          },
        },
      ],
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isSystem: true,
    }

    await this.saveLibrary(genshinLibrary)

    // UI自动化组件库
    const uiLibrary: ComponentLibrary = {
      id: 'ui-automation',
      name: 'UI自动化组件库',
      description: '通用UI自动化操作组件',
      version: '1.0.0',
      author: 'system',
      tags: ['ui', 'automation', 'generic'],
      category: 'ui-automation',
      components: [
        {
          id: 'smart-click',
          type: 'interaction',
          name: '智能点击',
          description: '智能识别并点击UI元素',
          icon: '🖱️',
          category: 'ui-interaction',
          tags: ['smart', 'click', 'ui-interaction'],
          inputs: [
            {
              id: 'target',
              name: '目标元素',
              type: 'selector',
              required: true,
              description: '要点击的UI元素描述或图像',
            },
            {
              id: 'method',
              name: '识别方式',
              type: 'enum',
              required: true,
              defaultValue: 'text',
              description: '元素识别方式',
              enumOptions: ['text', 'image', 'color', 'position'],
            },
            {
              id: 'confidence',
              name: '匹配置信度',
              type: 'number',
              required: false,
              defaultValue: 0.8,
              description: '图像匹配的置信度',
              validation: { min: 0.1, max: 1.0 },
            },
            {
              id: 'retryOnFail',
              name: '失败重试',
              type: 'boolean',
              required: false,
              defaultValue: true,
              description: '找不到元素时是否重试',
            },
          ],
          outputs: [
            {
              id: 'clicked',
              name: '点击成功',
              type: 'boolean',
              description: '是否成功点击元素',
            },
            {
              id: 'position',
              name: '点击位置',
              type: 'coordinate',
              description: '实际点击的坐标位置',
            },
          ],
          config: {
            canHaveChildren: false,
            executionTimeout: 10000,
            retryCount: 5,
            breakOnError: false,
          },
          validation: {
            required: ['target', 'method'],
          },
        },
      ],
      dependencies: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isSystem: true,
    }

    await this.saveLibrary(uiLibrary)

    // 创建组件模板
    await this.createDefaultTemplates()
  }

  private async createDefaultTemplates(): Promise<void> {
    const clickTemplate: ComponentTemplate = {
      id: 'click-template',
      name: '点击操作模板',
      description: '标准点击操作组件模板',
      category: 'ui-interaction',
      template: {
        id: 'template-click',
        type: 'interaction',
        name: '点击',
        description: '点击指定位置或元素',
        icon: '👆',
        category: 'ui-interaction',
        tags: ['template', 'click', 'ui-interaction'],
        inputs: [
          {
            id: 'target',
            name: '目标',
            type: 'coordinate',
            required: true,
            description: '点击目标位置',
          },
        ],
        outputs: [
          {
            id: 'result',
            name: '结果',
            type: 'boolean',
            description: '点击是否成功',
          },
        ],
        config: {
          canHaveChildren: false,
          executionTimeout: 5000,
          retryCount: 3,
          breakOnError: false,
        },
        validation: {
          required: ['target'],
        },
      },
      usage: {
        description: '用于点击屏幕上的指定位置或UI元素',
        parameters: [
          {
            name: 'target',
            type: 'coordinate | selector',
            required: true,
            description: '点击的目标位置或元素选择器',
            example: '{ x: 100, y: 200 }',
          },
        ],
        returns: [
          {
            name: 'result',
            type: 'boolean',
            description: '返回点击操作是否成功',
          },
        ],
        notes: [
          '支持坐标点击和元素选择器点击',
          '自动等待元素出现后再点击',
          '支持失败重试机制',
        ],
        warnings: [
          '确保目标位置在屏幕可见范围内',
          '使用元素选择器时需要等待页面加载完成',
        ],
      },
      examples: [
        {
          name: '坐标点击',
          description: '点击屏幕上的固定坐标位置',
          code: `{
  "target": { "x": 960, "y": 540 },
  "duration": 100
}`,
          inputs: { target: { x: 960, y: 540 } },
          expectedOutput: true,
        },
        {
          name: '元素点击',
          description: '点击UI元素',
          code: `{
  "target": "#login-button",
  "method": "selector"
}`,
          inputs: { target: '#login-button' },
        },
      ],
    }

    await this.saveTemplate(clickTemplate)
  }

  // 公共 API 方法

  async createLibrary(library: Omit<ComponentLibrary, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateLibraryId()
    const now = new Date()

    const fullLibrary: ComponentLibrary = {
      ...library,
      id,
      createdAt: now,
      updatedAt: now,
    }

    await this.saveLibrary(fullLibrary)
    this.libraries.set(id, fullLibrary)

    return id
  }

  async updateLibrary(id: string, updates: Partial<ComponentLibrary>): Promise<void> {
    const existing = this.libraries.get(id)
    if (!existing) {
      throw new Error(`Component library with id ${id} not found`)
    }

    if (existing.isSystem && updates.isSystem !== false) {
      throw new Error('Cannot modify system component libraries')
    }

    const updated: ComponentLibrary = {
      ...existing,
      ...updates,
      id, // 确保 ID 不被更改
      createdAt: existing.createdAt, // 保持创建时间
      updatedAt: new Date(),
    }

    await this.saveLibrary(updated)
    this.libraries.set(id, updated)
  }

  async deleteLibrary(id: string): Promise<void> {
    const library = this.libraries.get(id)
    if (!library) {
      throw new Error(`Component library with id ${id} not found`)
    }

    if (library.isSystem) {
      throw new Error('Cannot delete system component libraries')
    }

    const filePath = path.join(this.librariesDir, `${id}.json`)
    await fs.unlink(filePath)
    this.libraries.delete(id)
  }

  getLibrary(id: string): ComponentLibrary | null {
    return this.libraries.get(id) || null
  }

  getAllLibraries(): ComponentLibrary[] {
    return Array.from(this.libraries.values())
  }

  getLibrariesByFilter(filter: ComponentFilter): ComponentLibrary[] {
    let libraries = Array.from(this.libraries.values())

    if (filter.category) {
      libraries = libraries.filter(lib => lib.category === filter.category)
    }

    if (filter.tags && filter.tags.length > 0) {
      libraries = libraries.filter(lib =>
        filter.tags!.some(tag => lib.tags.includes(tag)),
      )
    }

    if (filter.author) {
      libraries = libraries.filter(lib => lib.author === filter.author)
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase()
      libraries = libraries.filter(lib =>
        lib.name.toLowerCase().includes(searchLower)
        || lib.description.toLowerCase().includes(searchLower),
      )
    }

    if (filter.isSystem !== undefined) {
      libraries = libraries.filter(lib => lib.isSystem === filter.isSystem)
    }

    return libraries
  }

  // 获取所有组件
  getAllComponents(): ActionBlock[] {
    const components: ActionBlock[] = []

    this.libraries.forEach((library) => {
      components.push(...library.components)
    })

    return components
  }

  // 按分类获取组件
  getComponentsByCategory(category: ActionCategory): ActionBlock[] {
    return this.getAllComponents().filter(comp => comp.category === category)
  }

  // 搜索组件
  searchComponents(query: string): ActionBlock[] {
    const queryLower = query.toLowerCase()
    return this.getAllComponents().filter(comp =>
      comp.name.toLowerCase().includes(queryLower)
      || comp.description.toLowerCase().includes(queryLower)
      || comp.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower)),
    )
  }

  // 模板管理
  async createTemplate(template: Omit<ComponentTemplate, 'id'>): Promise<string> {
    const id = this.generateTemplateId()
    const fullTemplate: ComponentTemplate = { ...template, id }

    await this.saveTemplate(fullTemplate)
    this.templates.set(id, fullTemplate)

    return id
  }

  getTemplate(id: string): ComponentTemplate | null {
    return this.templates.get(id) || null
  }

  getAllTemplates(): ComponentTemplate[] {
    return Array.from(this.templates.values())
  }

  // 统计信息
  getComponentStats(): ComponentStats {
    const libraries = Array.from(this.libraries.values())
    const allComponents = this.getAllComponents()

    const categories: { [key: string]: number } = {}
    const tags: { [key: string]: number } = {}
    let lastModified: Date | undefined

    allComponents.forEach((component) => {
      // 统计分类
      categories[component.category] = (categories[component.category] || 0) + 1

      // 统计标签 - 需要先检查 component 是否有 tags 属性
      const componentTags = (component as any).tags || []
      componentTags.forEach((tag: string) => {
        tags[tag] = (tags[tag] || 0) + 1
      })
    })

    libraries.forEach((library) => {
      if (!lastModified || library.updatedAt > lastModified) {
        lastModified = library.updatedAt
      }
    })

    return {
      totalComponents: allComponents.length,
      systemComponents: libraries.filter(lib => lib.isSystem).reduce((sum, lib) => sum + lib.components.length, 0),
      userComponents: libraries.filter(lib => !lib.isSystem).reduce((sum, lib) => sum + lib.components.length, 0),
      categories,
      tags,
      lastModified,
    }
  }

  // 导入导出
  async exportLibrary(id: string): Promise<string> {
    const library = this.getLibrary(id)
    if (!library) {
      throw new Error(`Component library with id ${id} not found`)
    }

    return JSON.stringify(library, this.dateReplacer, 2)
  }

  async importLibrary(libraryData: string): Promise<string> {
    const library = JSON.parse(libraryData, this.dateReviver) as ComponentLibrary

    // 生成新的 ID 避免冲突
    const newId = this.generateLibraryId()
    const importedLibrary: ComponentLibrary = {
      ...library,
      id: newId,
      isSystem: false, // 导入的库不能是系统库
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await this.saveLibrary(importedLibrary)
    this.libraries.set(newId, importedLibrary)

    return newId
  }

  // 私有辅助方法

  private async saveLibrary(library: ComponentLibrary): Promise<void> {
    const filePath = path.join(this.librariesDir, `${library.id}.json`)
    const data = JSON.stringify(library, this.dateReplacer, 2)
    await fs.writeFile(filePath, data, 'utf-8')
  }

  private async saveTemplate(template: ComponentTemplate): Promise<void> {
    const filePath = path.join(this.templatesDir, `${template.id}.json`)
    const data = JSON.stringify(template, this.dateReplacer, 2)
    await fs.writeFile(filePath, data, 'utf-8')
  }

  private generateLibraryId(): string {
    return `library_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

// 全局实例
export const componentLibraryManager = new ComponentLibraryManager()
