import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

// 脚本模板类型定义
export interface ScriptTemplate {
  id: string
  name: string
  description: string
  category: string
  version: string
  author: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
  isSystem: boolean
  template: ScriptTemplateContent
}

export interface ScriptTemplateContent {
  metadata: {
    gameVersion?: string
    requiredFeatures: string[]
    estimatedDuration?: number
  }
  steps: ScriptStep[]
  variables: ScriptVariable[]
  conditions: ScriptCondition[]
}

export interface ScriptStep {
  id: string
  type: 'action' | 'wait' | 'condition' | 'loop'
  name: string
  description?: string
  action?: ActionConfig
  condition?: ConditionConfig
  loop?: LoopConfig
  enabled: boolean
  order: number
}

export interface ActionConfig {
  type: 'click' | 'drag' | 'key' | 'wait' | 'screenshot' | 'navigate'
  target?: string
  coordinates?: { x: number, y: number }
  area?: { x: number, y: number, width: number, height: number }
  key?: string
  duration?: number
  url?: string
  params?: Record<string, any>
}

export interface ConditionConfig {
  type: 'element' | 'text' | 'image' | 'time' | 'custom'
  target?: string
  expected?: any
  timeout?: number
  retries?: number
  operator?: 'equals' | 'contains' | 'greater' | 'less' | 'exists'
}

export interface LoopConfig {
  type: 'count' | 'condition' | 'time'
  count?: number
  condition?: ConditionConfig
  duration?: number
  maxIterations?: number
  steps: string[] // step IDs
}

export interface ScriptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'object'
  defaultValue?: any
  description?: string
  required: boolean
}

export interface ScriptCondition {
  name: string
  type: 'pre' | 'post' | 'runtime'
  condition: ConditionConfig
  description?: string
}

export interface ScriptCategory {
  id: string
  name: string
  description: string
  parentId?: string
  order: number
}

export interface TemplateFilter {
  category?: string
  tags?: string[]
  author?: string
  searchText?: string
  isSystem?: boolean
}

export interface TemplateStats {
  totalTemplates: number
  systemTemplates: number
  userTemplates: number
  categories: { [key: string]: number }
  tags: { [key: string]: number }
  lastModified?: Date
}

// 脚本模板管理器
export class ScriptTemplateManager {
  private templatesDir: string
  private categoriesFile: string
  private templates: Map<string, ScriptTemplate> = new Map()
  private categories: Map<string, ScriptCategory> = new Map()
  private isInitialized = false

  constructor() {
    const configDir = path.join(os.homedir(), '.freedom')
    this.templatesDir = path.join(configDir, 'script-templates')
    this.categoriesFile = path.join(configDir, 'script-categories.json')
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    await this.ensureDirectories()
    await this.loadCategories()
    await this.loadTemplates()
    await this.ensureDefaultTemplates()

    this.isInitialized = true
  }

  private async ensureDirectories(): Promise<void> {
    try {
      await fs.access(this.templatesDir)
    }
    catch {
      await fs.mkdir(this.templatesDir, { recursive: true })
    }
  }

  private async loadCategories(): Promise<void> {
    try {
      const data = await fs.readFile(this.categoriesFile, 'utf-8')
      const categories = JSON.parse(data) as ScriptCategory[]

      this.categories.clear()
      for (const category of categories) {
        this.categories.set(category.id, category)
      }
    }
    catch {
      // 如果文件不存在，创建默认分类
      await this.createDefaultCategories()
    }
  }

  private async createDefaultCategories(): Promise<void> {
    const defaultCategories: ScriptCategory[] = [
      { id: 'daily', name: '日常任务', description: '每日委托、树脂清理等日常任务', order: 1 },
      { id: 'exploration', name: '探索收集', description: '采集、探索、解谜等', order: 2 },
      { id: 'combat', name: '战斗挑战', description: '深渊、周本、活动等战斗内容', order: 3 },
      { id: 'farming', name: '材料刷取', description: '圣遗物、天赋书、武器材料等', order: 4 },
      { id: 'event', name: '活动限时', description: '限时活动、节日活动等', order: 5 },
      { id: 'utility', name: '辅助工具', description: '截图、导航、状态检测等工具', order: 6 },
    ]

    for (const category of defaultCategories) {
      this.categories.set(category.id, category)
    }

    await this.saveCategories()
  }

  private async saveCategories(): Promise<void> {
    const categories = Array.from(this.categories.values())
    await fs.writeFile(
      this.categoriesFile,
      JSON.stringify(categories, null, 2),
      'utf-8',
    )
  }

  private async loadTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.templatesDir)
      const jsonFiles = files.filter(file => file.endsWith('.json'))

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.templatesDir, file)
          const data = await fs.readFile(filePath, 'utf-8')
          const template = JSON.parse(data, this.dateReviver) as ScriptTemplate

          this.templates.set(template.id, template)
        }
        catch (error) {
          console.warn(`Failed to load template ${file}:`, error)
        }
      }
    }
    catch (error) {
      console.warn('Failed to load templates:', error)
    }
  }

  private async ensureDefaultTemplates(): Promise<void> {
    if (this.templates.size === 0) {
      await this.createDefaultTemplates()
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    // 创建一个简单的日常任务模板示例
    const dailyTemplate: ScriptTemplate = {
      id: 'daily-commissions',
      name: '每日委托',
      description: '自动完成每日委托任务',
      category: 'daily',
      version: '1.0.0',
      author: 'system',
      tags: ['daily', 'commission', 'auto'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isSystem: true,
      template: {
        metadata: {
          gameVersion: '4.0+',
          requiredFeatures: ['navigation', 'combat', 'interaction'],
          estimatedDuration: 1800000, // 30分钟
        },
        steps: [
          {
            id: 'step-1',
            type: 'action',
            name: '打开冒险家协会',
            description: '导航到蒙德城冒险家协会',
            action: {
              type: 'navigate',
              target: 'mondstadt-guild',
              params: { method: 'waypoint' },
            },
            enabled: true,
            order: 1,
          },
          {
            id: 'step-2',
            type: 'action',
            name: '领取每日委托',
            description: '与凯瑟琳对话领取委托',
            action: {
              type: 'click',
              target: 'katharine-npc',
              coordinates: { x: 400, y: 300 },
            },
            enabled: true,
            order: 2,
          },
          {
            id: 'step-3',
            type: 'loop',
            name: '完成委托任务',
            description: '循环完成所有委托任务',
            loop: {
              type: 'count',
              count: 4,
              maxIterations: 4,
              steps: ['complete-commission'],
            },
            enabled: true,
            order: 3,
          },
        ],
        variables: [
          {
            name: 'maxRetries',
            type: 'number',
            defaultValue: 3,
            description: '任务失败时的最大重试次数',
            required: false,
          },
          {
            name: 'waitTimeout',
            type: 'number',
            defaultValue: 5000,
            description: '等待页面加载的超时时间（毫秒）',
            required: false,
          },
        ],
        conditions: [
          {
            name: 'gameLoaded',
            type: 'pre',
            condition: {
              type: 'element',
              target: 'game-canvas',
              operator: 'exists',
              timeout: 30000,
            },
            description: '确保游戏已完全加载',
          },
          {
            name: 'commissionsCompleted',
            type: 'post',
            condition: {
              type: 'text',
              target: 'commission-counter',
              expected: '4/4',
              operator: 'equals',
            },
            description: '验证所有委托任务已完成',
          },
        ],
      },
    }

    await this.saveTemplate(dailyTemplate)
  }

  // 公共 API 方法
  async createTemplate(template: Omit<ScriptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const id = this.generateTemplateId()
    const now = new Date()

    const fullTemplate: ScriptTemplate = {
      ...template,
      id,
      createdAt: now,
      updatedAt: now,
    }

    await this.saveTemplate(fullTemplate)
    this.templates.set(id, fullTemplate)

    return id
  }

  async updateTemplate(id: string, updates: Partial<ScriptTemplate>): Promise<void> {
    const existing = this.templates.get(id)
    if (!existing) {
      throw new Error(`Template with id ${id} not found`)
    }

    if (existing.isSystem && updates.isSystem !== false) {
      throw new Error('Cannot modify system templates')
    }

    const updated: ScriptTemplate = {
      ...existing,
      ...updates,
      id, // 确保 ID 不被更改
      createdAt: existing.createdAt, // 保持创建时间
      updatedAt: new Date(),
    }

    await this.saveTemplate(updated)
    this.templates.set(id, updated)
  }

  async deleteTemplate(id: string): Promise<void> {
    const template = this.templates.get(id)
    if (!template) {
      throw new Error(`Template with id ${id} not found`)
    }

    if (template.isSystem) {
      throw new Error('Cannot delete system templates')
    }

    const filePath = path.join(this.templatesDir, `${id}.json`)
    await fs.unlink(filePath)
    this.templates.delete(id)
  }

  getTemplate(id: string): ScriptTemplate | null {
    return this.templates.get(id) || null
  }

  getAllTemplates(): ScriptTemplate[] {
    return Array.from(this.templates.values())
  }

  getTemplatesByFilter(filter: TemplateFilter): ScriptTemplate[] {
    let templates = Array.from(this.templates.values())

    if (filter.category) {
      templates = templates.filter(t => t.category === filter.category)
    }

    if (filter.tags && filter.tags.length > 0) {
      templates = templates.filter(t =>
        filter.tags!.some(tag => t.tags.includes(tag)),
      )
    }

    if (filter.author) {
      templates = templates.filter(t => t.author === filter.author)
    }

    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase()
      templates = templates.filter(t =>
        t.name.toLowerCase().includes(searchLower)
        || t.description.toLowerCase().includes(searchLower),
      )
    }

    if (filter.isSystem !== undefined) {
      templates = templates.filter(t => t.isSystem === filter.isSystem)
    }

    return templates
  }

  getAllCategories(): ScriptCategory[] {
    return Array.from(this.categories.values())
      .sort((a, b) => a.order - b.order)
  }

  async createCategory(category: Omit<ScriptCategory, 'id'>): Promise<string> {
    const id = this.generateCategoryId()
    const fullCategory: ScriptCategory = { ...category, id }

    this.categories.set(id, fullCategory)
    await this.saveCategories()

    return id
  }

  async updateCategory(id: string, updates: Partial<ScriptCategory>): Promise<void> {
    const existing = this.categories.get(id)
    if (!existing) {
      throw new Error(`Category with id ${id} not found`)
    }

    const updated: ScriptCategory = {
      ...existing,
      ...updates,
      id, // 确保 ID 不被更改
    }

    this.categories.set(id, updated)
    await this.saveCategories()
  }

  async deleteCategory(id: string): Promise<void> {
    if (!this.categories.has(id)) {
      throw new Error(`Category with id ${id} not found`)
    }

    // 检查是否有模板使用此分类
    const templatesInCategory = this.getTemplatesByFilter({ category: id })
    if (templatesInCategory.length > 0) {
      throw new Error(`Cannot delete category: ${templatesInCategory.length} templates are using it`)
    }

    this.categories.delete(id)
    await this.saveCategories()
  }

  getTemplateStats(): TemplateStats {
    const templates = Array.from(this.templates.values())
    const categories: { [key: string]: number } = {}
    const tags: { [key: string]: number } = {}
    let lastModified: Date | undefined

    for (const template of templates) {
      // 统计分类
      categories[template.category] = (categories[template.category] || 0) + 1

      // 统计标签
      for (const tag of template.tags) {
        tags[tag] = (tags[tag] || 0) + 1
      }

      // 找到最新修改时间
      if (!lastModified || template.updatedAt > lastModified) {
        lastModified = template.updatedAt
      }
    }

    return {
      totalTemplates: templates.length,
      systemTemplates: templates.filter(t => t.isSystem).length,
      userTemplates: templates.filter(t => !t.isSystem).length,
      categories,
      tags,
      lastModified,
    }
  }

  async exportTemplate(id: string): Promise<string> {
    const template = this.getTemplate(id)
    if (!template) {
      throw new Error(`Template with id ${id} not found`)
    }

    return JSON.stringify(template, this.dateReplacer, 2)
  }

  async importTemplate(templateData: string): Promise<string> {
    const template = JSON.parse(templateData, this.dateReviver) as ScriptTemplate

    // 生成新的 ID 避免冲突
    const newId = this.generateTemplateId()
    const importedTemplate: ScriptTemplate = {
      ...template,
      id: newId,
      isSystem: false, // 导入的模板不能是系统模板
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await this.saveTemplate(importedTemplate)
    this.templates.set(newId, importedTemplate)

    return newId
  }

  async duplicateTemplate(id: string, newName?: string): Promise<string> {
    const original = this.getTemplate(id)
    if (!original) {
      throw new Error(`Template with id ${id} not found`)
    }

    const newId = this.generateTemplateId()
    const duplicated: ScriptTemplate = {
      ...original,
      id: newId,
      name: newName || `${original.name} (副本)`,
      isSystem: false, // 复制的模板不能是系统模板
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await this.saveTemplate(duplicated)
    this.templates.set(newId, duplicated)

    return newId
  }

  // 私有辅助方法
  private async saveTemplate(template: ScriptTemplate): Promise<void> {
    const filePath = path.join(this.templatesDir, `${template.id}.json`)
    const data = JSON.stringify(template, this.dateReplacer, 2)
    await fs.writeFile(filePath, data, 'utf-8')
  }

  private generateTemplateId(): string {
    return `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCategoryId(): string {
    return `category_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
export const scriptTemplateManager = new ScriptTemplateManager()
