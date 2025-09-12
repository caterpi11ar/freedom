import type { ScriptTemplate, ScriptTemplateContent, TemplateFilter } from '@freedom/core'
import fs from 'node:fs/promises'
import process from 'node:process'
import * as readline from 'node:readline'
import { scriptTemplateManager } from '@freedom/core'
import { globalStateManager } from '@freedom/shared'
import { Command } from 'commander'

export async function executeScriptList(): Promise<void> {
  console.log('📋 脚本模板列表:')

  try {
    await scriptTemplateManager.initialize()
    const templates = scriptTemplateManager.getAllTemplates()
    const categories = scriptTemplateManager.getAllCategories()

    if (templates.length === 0) {
      console.log('💭 暂无脚本模板')
      return
    }

    // 按分类分组显示
    for (const category of categories) {
      const templatesInCategory = templates.filter(t => t.category === category.id)
      if (templatesInCategory.length === 0)
        continue

      console.log(`\n📁 ${category.name} (${templatesInCategory.length})`)
      console.log(`   ${category.description}`)

      templatesInCategory.forEach((template, index) => {
        const systemMark = template.isSystem ? '🔧' : '👤'
        const tags = template.tags.length > 0 ? ` [${template.tags.join(', ')}]` : ''

        console.log(`   ${systemMark} ${index + 1}. ${template.name} (v${template.version})${tags}`)
        console.log(`      ${template.description}`)
        console.log(`      作者: ${template.author} | 更新: ${template.updatedAt.toLocaleString()}`)
      })
    }

    // 显示统计信息
    const stats = scriptTemplateManager.getTemplateStats()
    console.log(`\n📊 统计信息:`)
    console.log(`  总模板数: ${stats.totalTemplates}`)
    console.log(`  系统模板: ${stats.systemTemplates}`)
    console.log(`  用户模板: ${stats.userTemplates}`)
    console.log(`  分类数: ${Object.keys(stats.categories).length}`)
  }
  catch (error) {
    console.error('❌ 获取脚本模板列表失败:', error)
  }
}

export async function executeScriptShow(): Promise<void> {
  try {
    await scriptTemplateManager.initialize()
    const templates = scriptTemplateManager.getAllTemplates()

    if (templates.length === 0) {
      console.log('💭 暂无脚本模板')
      return
    }

    // 显示模板选择列表
    console.log('📋 选择要查看的模板:')
    templates.forEach((template, index) => {
      const systemMark = template.isSystem ? '🔧' : '👤'
      console.log(`  ${index + 1}. ${systemMark} ${template.name} - ${template.description}`)
    })

    const choice = await getInput(`\n请选择 (1-${templates.length}): `)
    const index = Number.parseInt(choice) - 1

    if (index < 0 || index >= templates.length) {
      console.log('❌ 无效选择')
      return
    }

    const template = templates[index]
    await displayTemplateDetails(template)
  }
  catch (error) {
    console.error('❌ 显示脚本模板失败:', error)
  }
}

async function displayTemplateDetails(template: ScriptTemplate): Promise<void> {
  console.log(`\n🔍 模板详情: ${template.name}`)
  console.log('─'.repeat(50))

  console.log(`📝 基本信息:`)
  console.log(`  名称: ${template.name}`)
  console.log(`  描述: ${template.description}`)
  console.log(`  分类: ${template.category}`)
  console.log(`  版本: ${template.version}`)
  console.log(`  作者: ${template.author}`)
  console.log(`  标签: ${template.tags.join(', ') || '无'}`)
  console.log(`  类型: ${template.isSystem ? '系统模板' : '用户模板'}`)
  console.log(`  创建时间: ${template.createdAt.toLocaleString()}`)
  console.log(`  更新时间: ${template.updatedAt.toLocaleString()}`)

  const { metadata, steps, variables, conditions } = template.template

  console.log(`\n⚙️  元数据:`)
  console.log(`  游戏版本: ${metadata.gameVersion || '不限'}`)
  console.log(`  所需功能: ${metadata.requiredFeatures.join(', ')}`)
  console.log(`  预计耗时: ${metadata.estimatedDuration ? `${Math.round(metadata.estimatedDuration / 60000)} 分钟` : '未知'}`)

  console.log(`\n🔧 脚本步骤 (${steps.length}):`)
  steps
    .sort((a, b) => a.order - b.order)
    .forEach((step, index) => {
      const enabledMark = step.enabled ? '✅' : '❌'
      const typeIcons = {
        action: '⚡',
        wait: '⏰',
        condition: '❓',
        loop: '🔄',
      }

      console.log(`  ${index + 1}. ${enabledMark} ${typeIcons[step.type]} ${step.name}`)
      if (step.description) {
        console.log(`     ${step.description}`)
      }
    })

  if (variables.length > 0) {
    console.log(`\n📊 变量 (${variables.length}):`)
    variables.forEach((variable, index) => {
      const requiredMark = variable.required ? '⚠️' : '📝'
      console.log(`  ${index + 1}. ${requiredMark} ${variable.name} (${variable.type})`)
      console.log(`     默认值: ${variable.defaultValue || '无'}`)
      if (variable.description) {
        console.log(`     说明: ${variable.description}`)
      }
    })
  }

  if (conditions.length > 0) {
    console.log(`\n✅ 执行条件 (${conditions.length}):`)
    conditions.forEach((condition, index) => {
      const typeIcons = {
        pre: '🟢',
        post: '🔴',
        runtime: '🟡',
      }

      console.log(`  ${index + 1}. ${typeIcons[condition.type]} ${condition.name}`)
      if (condition.description) {
        console.log(`     ${condition.description}`)
      }
    })
  }
}

export async function executeScriptSearch(): Promise<void> {
  try {
    await scriptTemplateManager.initialize()

    console.log('🔍 脚本模板搜索')

    const searchText = await getInput('搜索关键词 (可为空): ')
    const category = await getInput('分类 (可为空): ')
    const tags = await getInput('标签 (用逗号分隔，可为空): ')
    const author = await getInput('作者 (可为空): ')

    const filter: TemplateFilter = {}

    if (searchText.trim()) {
      filter.searchText = searchText.trim()
    }

    if (category.trim()) {
      filter.category = category.trim()
    }

    if (tags.trim()) {
      filter.tags = tags.trim().split(',').map(t => t.trim()).filter(t => t)
    }

    if (author.trim()) {
      filter.author = author.trim()
    }

    const results = scriptTemplateManager.getTemplatesByFilter(filter)

    console.log(`\n📋 搜索结果 (${results.length}):`)

    if (results.length === 0) {
      console.log('💭 未找到匹配的模板')
      return
    }

    results.forEach((template, index) => {
      const systemMark = template.isSystem ? '🔧' : '👤'
      const tags = template.tags.length > 0 ? ` [${template.tags.join(', ')}]` : ''

      console.log(`  ${index + 1}. ${systemMark} ${template.name} (v${template.version})${tags}`)
      console.log(`     ${template.description}`)
      console.log(`     分类: ${template.category} | 作者: ${template.author}`)
    })
  }
  catch (error) {
    console.error('❌ 搜索脚本模板失败:', error)
  }
}

export async function executeScriptCreate(): Promise<void> {
  console.log('✨ 创建新脚本模板')

  try {
    await scriptTemplateManager.initialize()

    // 获取基本信息
    const name = await getInput('模板名称: ')
    if (!name.trim()) {
      console.log('❌ 模板名称不能为空')
      return
    }

    const description = await getInput('模板描述: ')
    const version = await getInput('版本 (默认 1.0.0): ') || '1.0.0'
    const author = await getInput('作者: ')
    const tagsInput = await getInput('标签 (用逗号分隔): ')
    const tags = tagsInput.trim() ? tagsInput.split(',').map(t => t.trim()) : []

    // 选择分类
    const categories = scriptTemplateManager.getAllCategories()
    console.log('\n📁 选择分类:')
    categories.forEach((category, index) => {
      console.log(`  ${index + 1}. ${category.name} - ${category.description}`)
    })

    const categoryChoice = await getInput(`请选择分类 (1-${categories.length}): `)
    const categoryIndex = Number.parseInt(categoryChoice) - 1

    if (categoryIndex < 0 || categoryIndex >= categories.length) {
      console.log('❌ 无效的分类选择')
      return
    }

    const category = categories[categoryIndex].id

    // 创建简单的模板内容
    const templateContent: ScriptTemplateContent = {
      metadata: {
        requiredFeatures: ['navigation'],
        estimatedDuration: 600000, // 10分钟默认
      },
      steps: [
        {
          id: 'step-1',
          type: 'action',
          name: '开始执行',
          description: '脚本开始执行',
          action: {
            type: 'wait',
            duration: 1000,
          },
          enabled: true,
          order: 1,
        },
      ],
      variables: [],
      conditions: [],
    }

    const templateId = await scriptTemplateManager.createTemplate({
      name: name.trim(),
      description: description.trim() || '无描述',
      category,
      version: version.trim(),
      author: author.trim() || 'unknown',
      tags,
      isSystem: false,
      template: templateContent,
    })

    console.log(`✅ 模板创建成功！`)
    console.log(`🆔 模板ID: ${templateId}`)
    console.log(`📝 提示: 使用 /script edit 命令编辑模板内容`)

    // 更新状态
    globalStateManager.updateScriptBuilderState({
      isActive: true,
      currentTemplate: templateId,
      lastSaved: new Date(),
    })
  }
  catch (error) {
    console.error('❌ 创建脚本模板失败:', error)
  }
}

export async function executeScriptDelete(): Promise<void> {
  try {
    await scriptTemplateManager.initialize()
    const templates = scriptTemplateManager.getAllTemplates()
    const userTemplates = templates.filter(t => !t.isSystem)

    if (userTemplates.length === 0) {
      console.log('💭 暂无可删除的用户模板')
      return
    }

    console.log('🗑️  选择要删除的模板:')
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

    console.log(`\n⚠️  确认删除模板: ${template.name}?`)
    const confirm = await getInput('输入 "yes" 确认删除: ')

    if (confirm.toLowerCase() !== 'yes') {
      console.log('❌ 删除已取消')
      return
    }

    await scriptTemplateManager.deleteTemplate(template.id)
    console.log('✅ 模板删除成功！')
  }
  catch (error) {
    console.error('❌ 删除脚本模板失败:', error)
  }
}

export async function executeScriptStats(): Promise<void> {
  console.log('📊 脚本模板统计信息')

  try {
    await scriptTemplateManager.initialize()
    const stats = scriptTemplateManager.getTemplateStats()

    console.log('\n📋 总体统计:')
    console.log(`  总模板数: ${stats.totalTemplates}`)
    console.log(`  系统模板: ${stats.systemTemplates}`)
    console.log(`  用户模板: ${stats.userTemplates}`)
    console.log(`  最后修改: ${stats.lastModified?.toLocaleString() || '未知'}`)

    if (Object.keys(stats.categories).length > 0) {
      console.log('\n📁 分类统计:')
      Object.entries(stats.categories)
        .sort(([, a], [, b]) => b - a)
        .forEach(([category, count]) => {
          console.log(`  ${category}: ${count} 个模板`)
        })
    }

    if (Object.keys(stats.tags).length > 0) {
      console.log('\n🏷️  标签统计 (前10):')
      Object.entries(stats.tags)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([tag, count]) => {
          console.log(`  ${tag}: ${count} 次使用`)
        })
    }

    // 更新状态
    globalStateManager.updateScriptBuilderState({
      isActive: stats.totalTemplates > 0,
    })
  }
  catch (error) {
    console.error('❌ 获取统计信息失败:', error)
  }
}

export async function executeScriptExport(): Promise<void> {
  try {
    await scriptTemplateManager.initialize()
    const templates = scriptTemplateManager.getAllTemplates()

    if (templates.length === 0) {
      console.log('💭 暂无脚本模板')
      return
    }

    console.log('📦 选择要导出的模板:')
    templates.forEach((template, index) => {
      const systemMark = template.isSystem ? '🔧' : '👤'
      console.log(`  ${index + 1}. ${systemMark} ${template.name} - ${template.description}`)
    })

    const choice = await getInput(`\n请选择 (1-${templates.length}): `)
    const index = Number.parseInt(choice) - 1

    if (index < 0 || index >= templates.length) {
      console.log('❌ 无效选择')
      return
    }

    const template = templates[index]
    const exportData = await scriptTemplateManager.exportTemplate(template.id)

    // 保存到文件
    const filename = `${template.name.replace(/[^a-z0-9\u4E00-\u9FA5]/gi, '_')}_${template.id}.json`
    await fs.writeFile(filename, exportData, 'utf-8')

    console.log(`✅ 模板已导出到文件: ${filename}`)
  }
  catch (error) {
    console.error('❌ 导出脚本模板失败:', error)
  }
}

export async function executeScriptImport(): Promise<void> {
  try {
    await scriptTemplateManager.initialize()

    const filename = await getInput('请输入要导入的文件路径: ')
    if (!filename.trim()) {
      console.log('❌ 文件路径不能为空')
      return
    }

    const data = await fs.readFile(filename.trim(), 'utf-8')
    const templateId = await scriptTemplateManager.importTemplate(data)

    const template = scriptTemplateManager.getTemplate(templateId)
    console.log(`✅ 模板导入成功！`)
    console.log(`🆔 模板ID: ${templateId}`)
    console.log(`📝 模板名称: ${template?.name}`)
  }
  catch (error) {
    console.error('❌ 导入脚本模板失败:', error)
  }
}

// 创建脚本管理命令
export const scriptCommand = new Command('script')
  .description('脚本模板管理')

scriptCommand
  .command('list')
  .alias('ls')
  .description('显示所有脚本模板')
  .action(executeScriptList)

scriptCommand
  .command('show')
  .alias('view')
  .description('查看模板详情')
  .action(executeScriptShow)

scriptCommand
  .command('search')
  .alias('find')
  .description('搜索脚本模板')
  .action(executeScriptSearch)

scriptCommand
  .command('create')
  .alias('new')
  .description('创建新脚本模板')
  .action(executeScriptCreate)

scriptCommand
  .command('delete')
  .alias('remove')
  .description('删除脚本模板')
  .action(executeScriptDelete)

scriptCommand
  .command('stats')
  .description('显示统计信息')
  .action(executeScriptStats)

scriptCommand
  .command('export')
  .description('导出脚本模板')
  .action(executeScriptExport)

scriptCommand
  .command('import')
  .description('导入脚本模板')
  .action(executeScriptImport)

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
