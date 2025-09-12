import type { ScriptStep, ScriptTemplate, ScriptTemplateContent } from './ScriptTemplateManager'
import { scriptTemplateManager } from './ScriptTemplateManager'

// 操作块类型定义
export interface ActionBlock {
  tags: string[]
  id: string
  type: ActionBlockType
  name: string
  description: string
  icon: string
  category: ActionCategory
  inputs: BlockInput[]
  outputs: BlockOutput[]
  config: ActionBlockConfig
  validation: BlockValidation
}

export type ActionBlockType
  = | 'navigation' | 'interaction' | 'detection' | 'logic'
    | 'loop' | 'condition' | 'wait' | 'variable' | 'function'

export type ActionCategory
  = | 'game-control' | 'ui-interaction' | 'detection' | 'flow-control'
    | 'data-processing' | 'utility' | 'custom'

export interface BlockInput {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'coordinate' | 'selector' | 'image' | 'enum'
  required: boolean
  defaultValue?: string | number | boolean
  description: string
  validation?: InputValidation
  enumOptions?: string[]
}

export interface BlockOutput {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'coordinate' | 'element' | 'any'
  description: string
}

export interface ActionBlockConfig {
  canHaveChildren: boolean
  maxChildren?: number
  allowedChildTypes?: ActionBlockType[]
  executionTimeout?: number
  retryCount?: number
  breakOnError?: boolean
}

export interface BlockValidation {
  required: string[]
  conditional?: ConditionalValidation[]
  custom?: (block: ScriptBlockInstance) => ValidationResult
}

export interface ConditionalValidation {
  condition: string
  required: string[]
  message: string
}

export interface InputValidation {
  min?: number
  max?: number
  pattern?: string
  validator?: (value: any) => ValidationResult
}

export interface ValidationResult {
  valid: boolean
  message?: string
}

// 脚本构建实例
export interface ScriptBlockInstance {
  id: string
  blockId: string
  name: string
  position: { x: number, y: number }
  inputs: { [key: string]: any }
  children: ScriptBlockInstance[]
  parent?: string
  enabled: boolean
  collapsed: boolean
}

export interface ScriptBuilderProject {
  id: string
  name: string
  description: string
  version: string
  author: string
  tags: string[]
  category: string
  createdAt: Date
  updatedAt: Date
  blocks: ScriptBlockInstance[]
  connections: BlockConnection[]
  variables: ProjectVariable[]
  settings: ProjectSettings
}

export interface BlockConnection {
  id: string
  fromBlock: string
  fromOutput: string
  toBlock: string
  toInput: string
}

export interface ProjectVariable {
  id: string
  name: string
  type: 'string' | 'number' | 'boolean' | 'object'
  defaultValue: any
  description: string
  scope: 'global' | 'local'
}

export interface ProjectSettings {
  gameVersion?: string
  targetResolution: { width: number, height: number }
  executionMode: 'sequential' | 'parallel'
  errorHandling: 'stop' | 'continue' | 'retry'
  debugging: boolean
}

// 脚本构建器核心类
export class ScriptBuilder {
  private actionBlocks: Map<string, ActionBlock> = new Map()
  private projects: Map<string, ScriptBuilderProject> = new Map()

  constructor() {
    this.initializeDefaultBlocks()
  }

  // 初始化默认操作块
  private initializeDefaultBlocks(): void {
    // 游戏控制类操作块
    this.registerActionBlock({
      id: 'click',
      type: 'interaction',
      name: '点击',
      description: '点击屏幕上的指定位置或元素',
      icon: '👆',
      category: 'game-control',
      tags: ['interaction', 'click', 'game-control'],
      inputs: [
        {
          id: 'target',
          name: '目标',
          type: 'coordinate',
          required: true,
          description: '点击的目标位置或元素选择器',
        },
        {
          id: 'duration',
          name: '持续时间',
          type: 'number',
          required: false,
          defaultValue: 100,
          description: '点击持续时间（毫秒）',
          validation: { min: 10, max: 5000 },
        },
        {
          id: 'offset',
          name: '偏移',
          type: 'coordinate',
          required: false,
          description: '相对目标的偏移量',
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
    })

    this.registerActionBlock({
      id: 'wait',
      type: 'wait',
      name: '等待',
      description: '等待指定时间或条件',
      icon: '⏰',
      category: 'flow-control',
      tags: ['wait', 'delay', 'flow-control'],
      inputs: [
        {
          id: 'type',
          name: '等待类型',
          type: 'enum',
          required: true,
          defaultValue: 'time',
          description: '等待的类型',
          enumOptions: ['time', 'element', 'condition'],
        },
        {
          id: 'duration',
          name: '等待时间',
          type: 'number',
          required: false,
          defaultValue: 1000,
          description: '等待时间（毫秒）',
          validation: { min: 100, max: 60000 },
        },
        {
          id: 'target',
          name: '等待元素',
          type: 'selector',
          required: false,
          description: '等待出现的元素选择器',
        },
        {
          id: 'timeout',
          name: '超时时间',
          type: 'number',
          required: false,
          defaultValue: 10000,
          description: '最大等待时间（毫秒）',
        },
      ],
      outputs: [
        {
          id: 'result',
          name: '结果',
          type: 'boolean',
          description: '等待是否成功完成',
        },
      ],
      config: {
        canHaveChildren: false,
        executionTimeout: 60000,
        retryCount: 1,
        breakOnError: true,
      },
      validation: {
        required: ['type'],
        conditional: [
          {
            condition: 'type === "time"',
            required: ['duration'],
            message: '时间等待需要指定等待时间',
          },
          {
            condition: 'type === "element"',
            required: ['target'],
            message: '元素等待需要指定目标元素',
          },
        ],
      },
    })

    this.registerActionBlock({
      id: 'loop',
      type: 'loop',
      name: '循环',
      description: '重复执行子操作',
      icon: '🔄',
      category: 'flow-control',
      tags: ['loop', 'repeat', 'flow-control'],
      inputs: [
        {
          id: 'type',
          name: '循环类型',
          type: 'enum',
          required: true,
          defaultValue: 'count',
          description: '循环的类型',
          enumOptions: ['count', 'while', 'for-each'],
        },
        {
          id: 'count',
          name: '循环次数',
          type: 'number',
          required: false,
          defaultValue: 5,
          description: '循环执行次数',
          validation: { min: 1, max: 1000 },
        },
        {
          id: 'condition',
          name: '循环条件',
          type: 'string',
          required: false,
          description: 'while循环的条件表达式',
        },
        {
          id: 'maxIterations',
          name: '最大循环数',
          type: 'number',
          required: false,
          defaultValue: 100,
          description: '防止无限循环的最大次数限制',
        },
      ],
      outputs: [
        {
          id: 'iterations',
          name: '执行次数',
          type: 'number',
          description: '实际执行的循环次数',
        },
        {
          id: 'result',
          name: '结果',
          type: 'boolean',
          description: '循环是否成功完成',
        },
      ],
      config: {
        canHaveChildren: true,
        executionTimeout: 300000, // 5分钟
        retryCount: 1,
        breakOnError: false,
      },
      validation: {
        required: ['type'],
        conditional: [
          {
            condition: 'type === "count"',
            required: ['count'],
            message: '计数循环需要指定循环次数',
          },
          {
            condition: 'type === "while"',
            required: ['condition'],
            message: 'while循环需要指定条件表达式',
          },
        ],
      },
    })

    this.registerActionBlock({
      id: 'condition',
      type: 'condition',
      name: '条件判断',
      description: '根据条件决定是否执行子操作',
      icon: '❓',
      category: 'flow-control',
      tags: ['condition', 'if', 'flow-control'],
      inputs: [
        {
          id: 'condition',
          name: '判断条件',
          type: 'string',
          required: true,
          description: '条件表达式',
        },
        {
          id: 'operator',
          name: '操作符',
          type: 'enum',
          required: true,
          defaultValue: 'equals',
          description: '比较操作符',
          enumOptions: ['equals', 'not-equals', 'greater', 'less', 'contains', 'exists'],
        },
        {
          id: 'value',
          name: '比较值',
          type: 'string',
          required: false,
          description: '用于比较的值',
        },
        {
          id: 'timeout',
          name: '检查超时',
          type: 'number',
          required: false,
          defaultValue: 5000,
          description: '条件检查的超时时间（毫秒）',
        },
      ],
      outputs: [
        {
          id: 'result',
          name: '判断结果',
          type: 'boolean',
          description: '条件判断的结果',
        },
        {
          id: 'value',
          name: '获取的值',
          type: 'any',
          description: '从条件中获取的实际值',
        },
      ],
      config: {
        canHaveChildren: true,
        maxChildren: 2, // true分支和false分支
        executionTimeout: 10000,
        retryCount: 3,
        breakOnError: false,
      },
      validation: {
        required: ['condition', 'operator'],
      },
    })

    this.registerActionBlock({
      id: 'navigate',
      type: 'navigation',
      name: '导航',
      description: '导航到游戏中的指定位置',
      icon: '🧭',
      category: 'game-control',
      tags: ['navigate', 'teleport', 'game-control'],
      inputs: [
        {
          id: 'target',
          name: '目标位置',
          type: 'string',
          required: true,
          description: '导航目标（传送点、NPC、区域等）',
        },
        {
          id: 'method',
          name: '导航方式',
          type: 'enum',
          required: true,
          defaultValue: 'teleport',
          description: '导航使用的方式',
          enumOptions: ['teleport', 'walk', 'fly', 'auto'],
        },
        {
          id: 'timeout',
          name: '导航超时',
          type: 'number',
          required: false,
          defaultValue: 30000,
          description: '导航超时时间（毫秒）',
        },
      ],
      outputs: [
        {
          id: 'result',
          name: '导航结果',
          type: 'boolean',
          description: '导航是否成功',
        },
        {
          id: 'location',
          name: '当前位置',
          type: 'coordinate',
          description: '导航后的实际位置',
        },
      ],
      config: {
        canHaveChildren: false,
        executionTimeout: 60000,
        retryCount: 2,
        breakOnError: true,
      },
      validation: {
        required: ['target', 'method'],
      },
    })

    this.registerActionBlock({
      id: 'detect-element',
      type: 'detection',
      name: '检测元素',
      description: '检测屏幕上的UI元素或游戏对象',
      icon: '🔍',
      category: 'detection',
      tags: ['detect', 'element', 'detection'],
      inputs: [
        {
          id: 'target',
          name: '目标元素',
          type: 'selector',
          required: true,
          description: '要检测的元素选择器或图像',
        },
        {
          id: 'method',
          name: '检测方式',
          type: 'enum',
          required: true,
          defaultValue: 'text',
          description: '检测使用的方法',
          enumOptions: ['text', 'image', 'color', 'template'],
        },
        {
          id: 'area',
          name: '检测区域',
          type: 'coordinate',
          required: false,
          description: '限制检测的屏幕区域',
        },
        {
          id: 'confidence',
          name: '匹配度',
          type: 'number',
          required: false,
          defaultValue: 0.8,
          description: '图像匹配的置信度（0-1）',
          validation: { min: 0.1, max: 1.0 },
        },
      ],
      outputs: [
        {
          id: 'found',
          name: '是否找到',
          type: 'boolean',
          description: '是否检测到目标元素',
        },
        {
          id: 'location',
          name: '元素位置',
          type: 'coordinate',
          description: '检测到的元素位置',
        },
        {
          id: 'confidence',
          name: '匹配度',
          type: 'number',
          description: '实际的匹配置信度',
        },
      ],
      config: {
        canHaveChildren: false,
        executionTimeout: 10000,
        retryCount: 3,
        breakOnError: false,
      },
      validation: {
        required: ['target', 'method'],
      },
    })
  }

  // 注册新的操作块
  registerActionBlock(block: ActionBlock): void {
    this.actionBlocks.set(block.id, block)
  }

  // 获取所有操作块
  getAllActionBlocks(): ActionBlock[] {
    return Array.from(this.actionBlocks.values())
  }

  // 按分类获取操作块
  getActionBlocksByCategory(category: ActionCategory): ActionBlock[] {
    return Array.from(this.actionBlocks.values())
      .filter(block => block.category === category)
  }

  // 获取操作块
  getActionBlock(id: string): ActionBlock | undefined {
    return this.actionBlocks.get(id)
  }

  // 创建新项目
  createProject(name: string, description: string = ''): ScriptBuilderProject {
    const project: ScriptBuilderProject = {
      id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      version: '1.0.0',
      author: 'user',
      tags: [],
      category: 'custom',
      createdAt: new Date(),
      updatedAt: new Date(),
      blocks: [],
      connections: [],
      variables: [],
      settings: {
        targetResolution: { width: 1920, height: 1080 },
        executionMode: 'sequential',
        errorHandling: 'stop',
        debugging: false,
      },
    }

    this.projects.set(project.id, project)
    return project
  }

  // 获取项目
  getProject(id: string): ScriptBuilderProject | undefined {
    return this.projects.get(id)
  }

  // 添加块到项目
  addBlockToProject(projectId: string, blockId: string, position: { x: number, y: number }): ScriptBlockInstance | null {
    const project = this.projects.get(projectId)
    const actionBlock = this.actionBlocks.get(blockId)

    if (!project || !actionBlock) {
      return null
    }

    const blockInstance: ScriptBlockInstance = {
      id: `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      blockId,
      name: actionBlock.name,
      position,
      inputs: this.getDefaultInputs(actionBlock),
      children: [],
      enabled: true,
      collapsed: false,
    }

    project.blocks.push(blockInstance)
    project.updatedAt = new Date()

    return blockInstance
  }

  // 获取默认输入值
  private getDefaultInputs(actionBlock: ActionBlock): { [key: string]: any } {
    const inputs: { [key: string]: any } = {}

    actionBlock.inputs.forEach((input) => {
      if (input.defaultValue !== undefined) {
        inputs[input.id] = input.defaultValue
      }
    })

    return inputs
  }

  // 更新块输入
  updateBlockInput(projectId: string, blockInstanceId: string, inputId: string, value: any): boolean {
    const project = this.projects.get(projectId)
    if (!project)
      return false

    const blockInstance = project.blocks.find(b => b.id === blockInstanceId)
    if (!blockInstance)
      return false

    blockInstance.inputs[inputId] = value
    project.updatedAt = new Date()

    return true
  }

  // 连接块
  connectBlocks(projectId: string, connection: Omit<BlockConnection, 'id'>): boolean {
    const project = this.projects.get(projectId)
    if (!project)
      return false

    const connectionWithId: BlockConnection = {
      id: `connection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...connection,
    }

    project.connections.push(connectionWithId)
    project.updatedAt = new Date()

    return true
  }

  // 验证项目
  validateProject(projectId: string): ValidationResult[] {
    const project = this.projects.get(projectId)
    if (!project) {
      return [{ valid: false, message: '项目不存在' }]
    }

    const results: ValidationResult[] = []

    // 验证每个块
    project.blocks.forEach((blockInstance) => {
      const actionBlock = this.actionBlocks.get(blockInstance.blockId)
      if (!actionBlock) {
        results.push({ valid: false, message: `未知的操作块类型: ${blockInstance.blockId}` })
        return
      }

      // 验证必需输入
      actionBlock.validation.required.forEach((requiredInput) => {
        if (!(requiredInput in blockInstance.inputs) || blockInstance.inputs[requiredInput] === undefined || blockInstance.inputs[requiredInput] === '') {
          results.push({ valid: false, message: `块 "${blockInstance.name}" 缺少必需输入: ${requiredInput}` })
        }
      })

      // 验证条件要求
      if (actionBlock.validation.conditional) {
        actionBlock.validation.conditional.forEach((condition) => {
          // 简单的条件检查（实际实现需要更复杂的表达式解析）
          if (this.evaluateCondition(condition.condition, blockInstance.inputs)) {
            condition.required.forEach((requiredInput) => {
              if (!(requiredInput in blockInstance.inputs) || blockInstance.inputs[requiredInput] === undefined || blockInstance.inputs[requiredInput] === '') {
                results.push({ valid: false, message: condition.message })
              }
            })
          }
        })
      }
    })

    return results
  }

  // 简单的条件评估（实际实现需要更复杂的表达式解析器）
  private evaluateCondition(condition: string, inputs: { [key: string]: any }): boolean {
    // 这里应该有一个完整的表达式解析器
    // 现在只做简单的字符串匹配
    if (condition.includes('===')) {
      const [left, right] = condition.split('===').map(s => s.trim())
      const leftValue = left.startsWith('"') ? left.slice(1, -1) : inputs[left]
      const rightValue = right.startsWith('"') ? right.slice(1, -1) : inputs[right]
      return leftValue === rightValue
    }
    return false
  }

  // 生成脚本代码
  generateScript(projectId: string): ScriptTemplate | null {
    const project = this.projects.get(projectId)
    if (!project)
      return null

    // 验证项目
    const validationResults = this.validateProject(projectId)
    const hasErrors = validationResults.some(result => !result.valid)
    if (hasErrors) {
      throw new Error(`脚本验证失败: ${validationResults.filter(r => !r.valid).map(r => r.message).join(', ')}`)
    }

    // 转换项目为脚本模板
    const steps: ScriptStep[] = project.blocks
      .filter(block => block.enabled)
      .sort((a, b) => a.position.y - b.position.y) // 简单的垂直排序
      .map((block, index) => this.convertBlockToStep(block, index + 1))

    const template: ScriptTemplateContent = {
      metadata: {
        gameVersion: project.settings.gameVersion,
        requiredFeatures: this.extractRequiredFeatures(project.blocks),
        estimatedDuration: this.estimateExecutionTime(project.blocks),
      },
      steps,
      variables: project.variables.map(v => ({
        name: v.name,
        type: v.type,
        defaultValue: v.defaultValue,
        description: v.description,
        required: v.scope === 'global',
      })),
      conditions: [],
    }

    const scriptTemplate: ScriptTemplate = {
      id: `generated_${project.id}_${Date.now()}`,
      name: project.name,
      description: project.description,
      category: project.category,
      version: project.version,
      author: project.author,
      tags: [...project.tags, 'generated'],
      createdAt: new Date(),
      updatedAt: new Date(),
      isSystem: false,
      template,
    }

    return scriptTemplate
  }

  // 将块实例转换为脚本步骤
  private convertBlockToStep(blockInstance: ScriptBlockInstance, order: number): ScriptStep {
    const actionBlock = this.actionBlocks.get(blockInstance.blockId)!

    return {
      id: blockInstance.id,
      type: this.mapBlockTypeToStepType(actionBlock.type),
      name: blockInstance.name,
      description: actionBlock.description,
      action: {
        type: this.mapBlockTypeToActionType(actionBlock.type),
        ...blockInstance.inputs,
      },
      enabled: blockInstance.enabled,
      order,
    }
  }

  // 映射块类型到步骤类型
  private mapBlockTypeToStepType(blockType: ActionBlockType): 'action' | 'wait' | 'condition' | 'loop' {
    switch (blockType) {
      case 'wait': return 'wait'
      case 'condition': return 'condition'
      case 'loop': return 'loop'
      default: return 'action'
    }
  }

  // 映射块类型到动作类型
  private mapBlockTypeToActionType(blockType: ActionBlockType): 'click' | 'drag' | 'key' | 'wait' | 'screenshot' | 'navigate' {
    switch (blockType) {
      case 'interaction': return 'click'
      case 'navigation': return 'navigate'
      case 'detection': return 'screenshot'
      case 'wait': return 'wait'
      default: return 'click'
    }
  }

  // 提取所需功能
  private extractRequiredFeatures(blocks: ScriptBlockInstance[]): string[] {
    const features = new Set<string>()

    blocks.forEach((block) => {
      const actionBlock = this.actionBlocks.get(block.blockId)
      if (actionBlock) {
        switch (actionBlock.category) {
          case 'game-control':
            features.add('navigation')
            features.add('interaction')
            break
          case 'detection':
            features.add('image-recognition')
            break
          case 'ui-interaction':
            features.add('ui-automation')
            break
        }
      }
    })

    return Array.from(features)
  }

  // 估算执行时间
  private estimateExecutionTime(blocks: ScriptBlockInstance[]): number {
    let totalTime = 0

    blocks.forEach((block) => {
      const actionBlock = this.actionBlocks.get(block.blockId)
      if (actionBlock) {
        // 基础执行时间估算
        switch (actionBlock.type) {
          case 'interaction':
            totalTime += 500 // 点击等交互操作
            break
          case 'wait':
            totalTime += Number.parseInt(block.inputs.duration) || 1000
            break
          case 'navigation':
            totalTime += 3000 // 导航操作
            break
          case 'detection':
            totalTime += 1000 // 检测操作
            break
          case 'loop': {
            const loopCount = Number.parseInt(block.inputs.count) || 1
            totalTime += loopCount * 1000 // 循环内部时间估算
            break
          }
          default:
            totalTime += 500
        }
      }
    })

    return totalTime
  }

  // 保存项目到模板管理器
  async saveProjectAsTemplate(projectId: string): Promise<string> {
    const scriptTemplate = this.generateScript(projectId)
    if (!scriptTemplate) {
      throw new Error('无法生成脚本模板')
    }

    return await scriptTemplateManager.createTemplate(scriptTemplate)
  }
}

// 全局实例
export const scriptBuilder = new ScriptBuilder()
