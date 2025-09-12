import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import * as readline from 'node:readline'
import { globalStateManager } from '@freedom/shared'
import { Command } from 'commander'

// AI 提示词类型定义
interface PromptTemplate {
  id: string
  name: string
  description: string
  category: string
  template: string
  variables: PromptVariable[]
  examples: PromptExample[]
  tags: string[]
  author: string
  version: string
  isSystem: boolean
  createdAt: Date
  updatedAt: Date
  usage: {
    model?: string
    maxTokens?: number
    temperature?: number
    systemPrompt?: string
  }
}

interface PromptVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'array'
  description: string
  required: boolean
  defaultValue?: any
  options?: string[]
}

interface PromptExample {
  name: string
  input: Record<string, any>
  expectedOutput: string
  description?: string
}

interface PromptCategory {
  id: string
  name: string
  description: string
  icon: string
}

interface APIMethod {
  id: string
  name: string
  description: string
  category: string
  parameters: APIParameter[]
  returnType: string
  examples: APIExample[]
  relatedPrompts: string[]
}

interface APIParameter {
  name: string
  type: string
  description: string
  required: boolean
  defaultValue?: any
}

interface APIExample {
  name: string
  code: string
  description: string
}

// 提示词库管理器
class PromptLibraryManager {
  private promptsDir: string
  private apiDocsDir: string
  private templates: Map<string, PromptTemplate> = new Map()
  private apiMethods: Map<string, APIMethod> = new Map()
  private categories: PromptCategory[] = []

  constructor() {
    const baseDir = path.join(os.homedir(), '.freedom')
    this.promptsDir = path.join(baseDir, 'prompts')
    this.apiDocsDir = path.join(baseDir, 'api-docs')

    this.initializeDefaultCategories()
  }

  private initializeDefaultCategories(): void {
    this.categories = [
      { id: 'script-generation', name: '脚本生成', description: '用于生成游戏自动化脚本的提示词', icon: '⚡' },
      { id: 'error-diagnosis', name: '错误诊断', description: '用于分析和诊断错误的提示词', icon: '🔍' },
      { id: 'code-optimization', name: '代码优化', description: '用于代码优化建议的提示词', icon: '🚀' },
      { id: 'documentation', name: '文档生成', description: '用于生成文档的提示词', icon: '📝' },
      { id: 'testing', name: '测试用例', description: '用于生成测试用例的提示词', icon: '🧪' },
      { id: 'ui-automation', name: 'UI自动化', description: '用于UI元素识别和操作的提示词', icon: '🖱️' },
    ]
  }

  async initialize(): Promise<void> {
    await this.ensureDirectories()
    await this.loadTemplates()
    await this.loadAPIMethods()
    await this.createDefaultTemplates()
  }

  private async ensureDirectories(): Promise<void> {
    await fs.mkdir(this.promptsDir, { recursive: true })
    await fs.mkdir(this.apiDocsDir, { recursive: true })
  }

  private async loadTemplates(): Promise<void> {
    try {
      const files = await fs.readdir(this.promptsDir)
      const templateFiles = files.filter(f => f.endsWith('.json'))

      for (const file of templateFiles) {
        try {
          const content = await fs.readFile(path.join(this.promptsDir, file), 'utf-8')
          const template: PromptTemplate = JSON.parse(content, this.dateReviver)
          this.templates.set(template.id, template)
        }
        catch (error) {
          console.warn(`加载提示词模板失败: ${file}`, error)
        }
      }
    }
    catch {
      // 目录不存在时忽略
    }
  }

  private async loadAPIMethods(): Promise<void> {
    try {
      const files = await fs.readdir(this.apiDocsDir)
      const methodFiles = files.filter(f => f.endsWith('.json'))

      for (const file of methodFiles) {
        try {
          const content = await fs.readFile(path.join(this.apiDocsDir, file), 'utf-8')
          const method: APIMethod = JSON.parse(content)
          this.apiMethods.set(method.id, method)
        }
        catch (error) {
          console.warn(`加载API方法失败: ${file}`, error)
        }
      }
    }
    catch {
      // 目录不存在时忽略
    }
  }

  private async createDefaultTemplates(): Promise<void> {
    if (this.templates.size > 0)
      return

    const defaultTemplates: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: '脚本错误分析',
        description: '分析脚本执行错误并提供解决方案',
        category: 'error-diagnosis',
        template: `分析以下游戏自动化脚本的错误：

错误信息：{{error_message}}
脚本代码：{{script_code}}
执行环境：{{environment}}

请提供：
1. 错误原因分析
2. 具体解决方案
3. 预防措施
4. 相关代码修改建议`,
        variables: [
          { name: 'error_message', type: 'string', description: '错误信息', required: true },
          { name: 'script_code', type: 'string', description: '脚本代码片段', required: true },
          { name: 'environment', type: 'string', description: '执行环境信息', required: false, defaultValue: 'browser' },
        ],
        examples: [
          {
            name: '元素查找失败',
            input: {
              error_message: 'Element not found: #login-button',
              script_code: 'await page.click("#login-button")',
              environment: 'playwright',
            },
            expectedOutput: '分析元素定位失败的原因和解决方案',
          },
        ],
        tags: ['错误分析', '调试', '脚本'],
        author: 'system',
        version: '1.0.0',
        isSystem: true,
        usage: {
          model: 'gpt-4',
          maxTokens: 1000,
          temperature: 0.3,
        },
      },
      {
        name: '游戏元素识别',
        description: '生成游戏UI元素识别和操作脚本',
        category: 'ui-automation',
        template: `为游戏界面生成元素识别脚本：

游戏界面描述：{{interface_description}}
目标操作：{{target_action}}
元素特征：{{element_features}}

生成包含以下内容的脚本：
1. 元素定位策略
2. 等待和错误处理
3. 操作执行代码
4. 结果验证

请使用 {{framework}} 框架。`,
        variables: [
          { name: 'interface_description', type: 'string', description: '游戏界面描述', required: true },
          { name: 'target_action', type: 'string', description: '需要执行的操作', required: true },
          { name: 'element_features', type: 'string', description: '元素特征描述', required: false },
          { name: 'framework', type: 'string', description: '使用的自动化框架', required: false, defaultValue: 'playwright', options: ['playwright', 'selenium', 'puppeteer'] },
        ],
        examples: [
          {
            name: '点击登录按钮',
            input: {
              interface_description: '游戏登录界面',
              target_action: '点击登录按钮',
              element_features: '蓝色按钮，文字为"登录"',
              framework: 'playwright',
            },
            expectedOutput: '生成包含元素定位和点击的完整脚本',
          },
        ],
        tags: ['UI自动化', '元素识别', '脚本生成'],
        author: 'system',
        version: '1.0.0',
        isSystem: true,
        usage: {
          model: 'gpt-4',
          maxTokens: 800,
          temperature: 0.2,
        },
      },
      {
        name: '代码优化建议',
        description: '分析代码并提供优化建议',
        category: 'code-optimization',
        template: `分析以下代码并提供优化建议：

代码类型：{{code_type}}
代码内容：{{code_content}}
性能问题：{{performance_issues}}

请提供：
1. 代码质量评估
2. 性能优化建议
3. 可维护性改进
4. 最佳实践建议
5. 优化后的代码示例`,
        variables: [
          { name: 'code_type', type: 'string', description: '代码类型', required: true, options: ['javascript', 'typescript', 'python', 'automation-script'] },
          { name: 'code_content', type: 'string', description: '需要优化的代码', required: true },
          { name: 'performance_issues', type: 'string', description: '已知的性能问题', required: false },
        ],
        examples: [
          {
            name: '循环优化',
            input: {
              code_type: 'javascript',
              code_content: 'for(let i = 0; i < elements.length; i++) { await element[i].click(); }',
              performance_issues: '大量元素时执行缓慢',
            },
            expectedOutput: '提供并发优化和批处理的建议',
          },
        ],
        tags: ['代码优化', '性能', '最佳实践'],
        author: 'system',
        version: '1.0.0',
        isSystem: true,
        usage: {
          model: 'gpt-4',
          maxTokens: 1200,
          temperature: 0.3,
        },
      },
    ]

    for (const templateData of defaultTemplates) {
      const template: PromptTemplate = {
        ...templateData,
        id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      await this.saveTemplate(template)
      this.templates.set(template.id, template)
    }
  }

  async saveTemplate(template: PromptTemplate): Promise<void> {
    const filename = `${template.name.replace(/[^a-z0-9\u4E00-\u9FA5]/gi, '_')}_${template.id}.json`
    const filePath = path.join(this.promptsDir, filename)

    const content = JSON.stringify(template, this.dateReplacer, 2)
    await fs.writeFile(filePath, content, 'utf-8')
  }

  async createTemplate(data: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const template: PromptTemplate = {
      ...data,
      id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await this.saveTemplate(template)
    this.templates.set(template.id, template)
    return template.id
  }

  async deleteTemplate(id: string): Promise<boolean> {
    const template = this.templates.get(id)
    if (!template || template.isSystem)
      return false

    try {
      const files = await fs.readdir(this.promptsDir)
      const templateFile = files.find(f => f.includes(id))

      if (templateFile) {
        await fs.unlink(path.join(this.promptsDir, templateFile))
      }

      this.templates.delete(id)
      return true
    }
    catch {
      return false
    }
  }

  getAllTemplates(): PromptTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  }

  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id)
  }

  getTemplatesByCategory(category: string): PromptTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category)
  }

  searchTemplates(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase()
    return this.getAllTemplates().filter(template =>
      template.name.toLowerCase().includes(lowerQuery)
      || template.description.toLowerCase().includes(lowerQuery)
      || template.tags.some(tag => tag.toLowerCase().includes(lowerQuery)),
    )
  }

  getCategories(): PromptCategory[] {
    return this.categories
  }

  generatePrompt(templateId: string, variables: Record<string, any>): string {
    const template = this.templates.get(templateId)
    if (!template)
      throw new Error('模板不存在')

    let prompt = template.template

    // 替换变量
    for (const variable of template.variables) {
      const value = variables[variable.name] ?? variable.defaultValue ?? ''
      const placeholder = new RegExp(`{{${variable.name}}}`, 'g')
      prompt = prompt.replace(placeholder, String(value))
    }

    return prompt
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

const promptLibraryManager = new PromptLibraryManager()

export async function executePromptList(): Promise<void> {
  console.log('📚 AI 提示词库')

  try {
    await promptLibraryManager.initialize()
    const templates = promptLibraryManager.getAllTemplates()
    const categories = promptLibraryManager.getCategories()

    if (templates.length === 0) {
      console.log('💭 提示词库为空')
      return
    }

    // 按分类分组显示
    for (const category of categories) {
      const categoryTemplates = templates.filter(t => t.category === category.id)
      if (categoryTemplates.length === 0)
        continue

      console.log(`\n${category.icon} ${category.name} (${categoryTemplates.length})`)
      console.log(`   ${category.description}`)

      categoryTemplates.slice(0, 5).forEach((template, index) => {
        const systemMark = template.isSystem ? '🔧' : '👤'
        const tags = template.tags.length > 0 ? ` [${template.tags.slice(0, 2).join(', ')}]` : ''

        console.log(`   ${systemMark} ${index + 1}. ${template.name} (v${template.version})${tags}`)
        console.log(`      ${template.description}`)
      })

      if (categoryTemplates.length > 5) {
        console.log(`      ... 还有 ${categoryTemplates.length - 5} 个模板`)
      }
    }

    console.log(`\n📊 总计: ${templates.length} 个提示词模板`)
  }
  catch (error) {
    console.error('❌ 获取提示词库失败:', error)
  }
}

export async function executePromptCreate(): Promise<void> {
  console.log('✨ 创建新提示词模板')

  try {
    await promptLibraryManager.initialize()

    const name = await getInput('模板名称: ')
    if (!name.trim()) {
      console.log('❌ 模板名称不能为空')
      return
    }

    const description = await getInput('模板描述: ')

    // 选择分类
    const categories = promptLibraryManager.getCategories()
    console.log('\n📁 选择分类:')
    categories.forEach((category, index) => {
      console.log(`  ${index + 1}. ${category.icon} ${category.name} - ${category.description}`)
    })

    const categoryChoice = await getInput(`请选择分类 (1-${categories.length}): `)
    const categoryIndex = Number.parseInt(categoryChoice) - 1

    if (categoryIndex < 0 || categoryIndex >= categories.length) {
      console.log('❌ 无效的分类选择')
      return
    }

    const category = categories[categoryIndex].id

    console.log('\n📝 输入提示词模板 (支持变量 {{variable_name}}):')
    const template = await getMultilineInput('> ')

    if (!template.trim()) {
      console.log('❌ 提示词模板不能为空')
      return
    }

    // 解析变量
    const variableMatches = template.match(/\{\{(\w+)\}\}/g) || []
    const variableNames = [...new Set(variableMatches.map(match => match.slice(2, -2)))]

    const variables: PromptVariable[] = []

    if (variableNames.length > 0) {
      console.log(`\n🔧 检测到 ${variableNames.length} 个变量，请配置:`)

      for (const varName of variableNames) {
        console.log(`\n变量: ${varName}`)
        const varDescription = await getInput('  描述: ')
        const varType = await getInput('  类型 (string/number/boolean/array, 默认string): ') || 'string'
        const varRequired = await getInput('  是否必需 (y/N): ')
        const varDefault = await getInput('  默认值 (可选): ')

        variables.push({
          name: varName,
          type: varType as any,
          description: varDescription || '',
          required: varRequired.toLowerCase() === 'y',
          defaultValue: varDefault || undefined,
        })
      }
    }

    const version = await getInput('版本 (默认 1.0.0): ') || '1.0.0'
    const author = await getInput('作者: ') || 'user'
    const tagsInput = await getInput('标签 (用逗号分隔): ')
    const tags = tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()) : []

    const templateId = await promptLibraryManager.createTemplate({
      name: name.trim(),
      description: description.trim() || '无描述',
      category,
      template: template.trim(),
      variables,
      examples: [],
      tags,
      author: author.trim(),
      version: version.trim(),
      isSystem: false,
      usage: {
        model: 'gpt-4',
        maxTokens: 1000,
        temperature: 0.3,
      },
    })

    console.log('\n✅ 提示词模板创建成功！')
    console.log(`🆔 模板ID: ${templateId}`)
    console.log(`📝 模板名称: ${name}`)
    console.log(`🔧 变量数量: ${variables.length}`)

    // 更新状态
    globalStateManager.updatePromptLibraryState({
      totalPrompts: promptLibraryManager.getAllTemplates().length,
      lastUsed: new Date(),
    })
  }
  catch (error) {
    console.error('❌ 创建提示词模板失败:', error)
  }
}

export async function executePromptGenerate(): Promise<void> {
  console.log('🎯 使用提示词模板生成内容')

  try {
    await promptLibraryManager.initialize()
    const templates = promptLibraryManager.getAllTemplates()

    if (templates.length === 0) {
      console.log('💭 暂无提示词模板')
      return
    }

    console.log('📋 选择要使用的模板:')
    templates.forEach((template, index) => {
      const systemMark = template.isSystem ? '🔧' : '👤'
      console.log(`  ${index + 1}. ${systemMark} ${template.name} - ${template.description}`)
    })

    const choice = await getInput(`\n请选择模板 (1-${templates.length}): `)
    const index = Number.parseInt(choice) - 1

    if (index < 0 || index >= templates.length) {
      console.log('❌ 无效选择')
      return
    }

    const template = templates[index]

    console.log(`\n🎯 使用模板: ${template.name}`)
    console.log(`📖 描述: ${template.description}`)

    const variables: Record<string, any> = {}

    if (template.variables.length > 0) {
      console.log('\n🔧 请输入变量值:')

      for (const variable of template.variables) {
        const required = variable.required ? ' (必需)' : ' (可选)'
        const defaultHint = variable.defaultValue ? ` [默认: ${variable.defaultValue}]` : ''

        console.log(`\n${variable.name}${required}${defaultHint}`)
        console.log(`  类型: ${variable.type}`)
        console.log(`  说明: ${variable.description}`)

        const input = await getInput('  值: ')

        if (input.trim()) {
          // 简单的类型转换
          switch (variable.type) {
            case 'number':
              variables[variable.name] = Number(input)
              break
            case 'boolean':
              variables[variable.name] = input.toLowerCase() === 'true' || input.toLowerCase() === 'y'
              break
            case 'array':
              variables[variable.name] = input.split(',').map(s => s.trim())
              break
            default:
              variables[variable.name] = input
          }
        }
        else if (variable.defaultValue !== undefined) {
          variables[variable.name] = variable.defaultValue
        }
        else if (variable.required) {
          console.log('❌ 必需变量不能为空')
          return
        }
      }
    }

    // 生成提示词
    console.log('\n🚀 生成的提示词:')
    console.log('─'.repeat(80))

    const generatedPrompt = promptLibraryManager.generatePrompt(template.id, variables)
    console.log(generatedPrompt)

    console.log('─'.repeat(80))

    // 询问是否保存
    const saveToFile = await getInput('\n💾 是否保存到文件？(y/N): ')
    if (saveToFile.toLowerCase() === 'y' || saveToFile.toLowerCase() === 'yes') {
      const filename = `prompt_${Date.now()}.txt`
      await fs.writeFile(filename, generatedPrompt, 'utf-8')
      console.log(`✅ 已保存到: ${filename}`)
    }

    // 显示API使用建议
    if (template.usage) {
      console.log('\n💡 API 使用建议:')
      console.log(`  推荐模型: ${template.usage.model || 'gpt-4'}`)
      console.log(`  最大token: ${template.usage.maxTokens || 1000}`)
      console.log(`  温度参数: ${template.usage.temperature || 0.3}`)
    }
  }
  catch (error) {
    console.error('❌ 生成提示词失败:', error)
  }
}

export async function executePromptSearch(): Promise<void> {
  console.log('🔍 搜索提示词模板')

  try {
    await promptLibraryManager.initialize()

    const query = await getInput('搜索关键词: ')
    if (!query.trim()) {
      console.log('❌ 搜索关键词不能为空')
      return
    }

    const results = promptLibraryManager.searchTemplates(query.trim())

    console.log(`\n📋 搜索结果 (${results.length}):`)

    if (results.length === 0) {
      console.log('💭 未找到匹配的模板')
      return
    }

    results.forEach((template, index) => {
      const systemMark = template.isSystem ? '🔧' : '👤'
      const tags = template.tags.length > 0 ? ` [${template.tags.join(', ')}]` : ''

      console.log(`\n  ${index + 1}. ${systemMark} ${template.name} (v${template.version})${tags}`)
      console.log(`     ${template.description}`)
      console.log(`     分类: ${template.category} | 作者: ${template.author}`)
      console.log(`     变量: ${template.variables.length} 个`)
    })
  }
  catch (error) {
    console.error('❌ 搜索提示词失败:', error)
  }
}

export async function executePromptDelete(): Promise<void> {
  console.log('🗑️ 删除提示词模板')

  try {
    await promptLibraryManager.initialize()
    const templates = promptLibraryManager.getAllTemplates()
    const userTemplates = templates.filter(t => !t.isSystem)

    if (userTemplates.length === 0) {
      console.log('💭 暂无可删除的用户模板')
      return
    }

    console.log('选择要删除的模板:')
    userTemplates.forEach((template, index) => {
      console.log(`  ${index + 1}. ${template.name} - ${template.description}`)
    })

    const choice = await getInput(`\n请选择 (1-${userTemplates.length}): `)
    const index = Number.parseInt(choice) - 1

    if (index < 0 || index >= userTemplates.length) {
      console.log('❌ 无效选择')
      return
    }

    const template = userTemplates[index]

    console.log(`\n⚠️ 确认删除模板: ${template.name}?`)
    const confirm = await getInput('输入 "yes" 确认删除: ')

    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ 删除已取消')
      return
    }

    const success = await promptLibraryManager.deleteTemplate(template.id)
    if (success) {
      console.log('✅ 模板删除成功！')
    }
    else {
      console.log('❌ 删除失败')
    }
  }
  catch (error) {
    console.error('❌ 删除提示词模板失败:', error)
  }
}

export async function executePromptStats(): Promise<void> {
  console.log('📊 提示词库统计信息')

  try {
    await promptLibraryManager.initialize()
    const templates = promptLibraryManager.getAllTemplates()
    const categories = promptLibraryManager.getCategories()

    console.log('\n📋 总体统计:')
    console.log(`  总模板数: ${templates.length}`)
    console.log(`  系统模板: ${templates.filter(t => t.isSystem).length}`)
    console.log(`  用户模板: ${templates.filter(t => !t.isSystem).length}`)

    // 分类统计
    if (categories.length > 0) {
      console.log('\n📁 分类统计:')
      categories.forEach((category) => {
        const count = templates.filter(t => t.category === category.id).length
        console.log(`  ${category.icon} ${category.name}: ${count} 个模板`)
      })
    }

    // 标签统计
    const tagCounts: Record<string, number> = {}
    templates.forEach((template) => {
      template.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    })

    if (Object.keys(tagCounts).length > 0) {
      console.log('\n🏷️ 热门标签 (前10):')
      Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([tag, count]) => {
          console.log(`  ${tag}: ${count} 次使用`)
        })
    }

    // 更新全局状态
    globalStateManager.updatePromptLibraryState({
      totalPrompts: templates.length,
      lastUsed: new Date(),
    })
  }
  catch (error) {
    console.error('❌ 获取统计信息失败:', error)
  }
}

// 创建AI提示词库命令
export const promptCommand = new Command('prompt')
  .description('AI 提示词库管理')

promptCommand
  .command('list')
  .alias('ls')
  .description('显示所有提示词模板')
  .action(executePromptList)

promptCommand
  .command('create')
  .alias('new')
  .description('创建新提示词模板')
  .action(executePromptCreate)

promptCommand
  .command('generate')
  .alias('gen')
  .description('使用模板生成提示词')
  .action(executePromptGenerate)

promptCommand
  .command('search')
  .alias('find')
  .description('搜索提示词模板')
  .action(executePromptSearch)

promptCommand
  .command('delete')
  .alias('remove')
  .description('删除提示词模板')
  .action(executePromptDelete)

promptCommand
  .command('stats')
  .description('显示统计信息')
  .action(executePromptStats)

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

// 多行输入获取函数
async function getMultilineInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const lines: string[] = []

  return new Promise((resolve) => {
    console.log('输入提示词模板 (输入空行结束):')

    const askForLine = () => {
      rl.question(prompt, (line: string) => {
        if (line.trim() === '') {
          rl.close()
          resolve(lines.join('\n'))
        }
        else {
          lines.push(line)
          askForLine()
        }
      })
    }

    askForLine()
  })
}
