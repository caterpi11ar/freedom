import process from 'node:process'
import * as readline from 'node:readline'
import { globalStateManager } from '@freedom/shared'
import { Command } from 'commander'

// Task Management Types
interface TaskInfo {
  id: string
  name: string
  scriptId?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  progress: number
  metadata: Record<string, any>
  accountId?: string
  estimatedDuration?: number
  actualDuration?: number
  error?: string
}

interface TaskQueueStats {
  totalTasks: number
  pendingTasks: number
  runningTasks: number
  completedTasks: number
  failedTasks: number
  pausedTasks: number
}

// Simple in-memory task store
class TaskManager {
  private tasks: Map<string, TaskInfo> = new Map()
  private runningTasks = new Set<string>()

  createTask(data: Omit<TaskInfo, 'id' | 'createdAt' | 'progress'>): TaskInfo {
    const task: TaskInfo = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      progress: 0,
      ...data,
    }

    this.tasks.set(task.id, task)
    return task
  }

  getTask(id: string): TaskInfo | undefined {
    return this.tasks.get(id)
  }

  getAllTasks(): TaskInfo[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getTasksByStatus(status: TaskInfo['status']): TaskInfo[] {
    return this.getAllTasks().filter(task => task.status === status)
  }

  updateTask(id: string, updates: Partial<TaskInfo>): boolean {
    const task = this.tasks.get(id)
    if (!task)
      return false

    Object.assign(task, updates)
    this.tasks.set(id, task)
    return true
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id)
  }

  getStats(): TaskQueueStats {
    const tasks = this.getAllTasks()
    return {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter(t => t.status === 'pending').length,
      runningTasks: tasks.filter(t => t.status === 'running').length,
      completedTasks: tasks.filter(t => t.status === 'completed').length,
      failedTasks: tasks.filter(t => t.status === 'failed').length,
      pausedTasks: tasks.filter(t => t.status === 'paused').length,
    }
  }

  pauseTask(id: string): boolean {
    const task = this.getTask(id)
    if (!task || task.status !== 'running')
      return false

    this.updateTask(id, { status: 'paused' })
    this.runningTasks.delete(id)
    return true
  }

  resumeTask(id: string): boolean {
    const task = this.getTask(id)
    if (!task || task.status !== 'paused')
      return false

    this.updateTask(id, { status: 'running' })
    this.runningTasks.add(id)
    return true
  }

  cancelTask(id: string): boolean {
    const task = this.getTask(id)
    if (!task || task.status === 'completed')
      return false

    this.updateTask(id, {
      status: 'failed',
      error: 'Task cancelled by user',
      completedAt: new Date(),
    })
    this.runningTasks.delete(id)
    return true
  }
}

const taskManager = new TaskManager()

export async function executeTaskList(): Promise<void> {
  console.log('📋 任务队列状态')

  const tasks = taskManager.getAllTasks()
  const stats = taskManager.getStats()

  // 显示统计信息
  console.log('\n📊 队列统计:')
  console.log(`  总任务数: ${stats.totalTasks}`)
  console.log(`  等待中: ${stats.pendingTasks} | 运行中: ${stats.runningTasks}`)
  console.log(`  已完成: ${stats.completedTasks} | 失败: ${stats.failedTasks} | 暂停: ${stats.pausedTasks}`)

  if (tasks.length === 0) {
    console.log('\n💭 任务队列为空')
    return
  }

  // 按状态分组显示任务
  const statusGroups = {
    running: '🏃 运行中',
    pending: '⏳ 等待中',
    paused: '⏸️  已暂停',
    completed: '✅ 已完成',
    failed: '❌ 失败',
  }

  for (const [status, icon] of Object.entries(statusGroups)) {
    const statusTasks = tasks.filter(t => t.status === status)
    if (statusTasks.length === 0)
      continue

    console.log(`\n${icon} (${statusTasks.length})`)
    statusTasks.slice(0, 5).forEach((task, index) => {
      const priority = task.priority === 'urgent' ? '🔥' : task.priority === 'high' ? '⚡' : ''
      const progress = task.status === 'running' ? ` ${task.progress}%` : ''
      const duration = task.estimatedDuration ? ` (~${Math.round(task.estimatedDuration / 60000)}min)` : ''

      console.log(`  ${index + 1}. ${priority} ${task.name}${progress}${duration}`)
      console.log(`     ID: ${task.id.split('_')[1]} | 创建: ${task.createdAt.toLocaleString()}`)

      if (task.error) {
        console.log(`     错误: ${task.error}`)
      }
    })

    if (statusTasks.length > 5) {
      console.log(`     ... 还有 ${statusTasks.length - 5} 个任务`)
    }
  }
}

export async function executeTaskCreate(): Promise<void> {
  console.log('✨ 创建新任务')

  try {
    const name = await getInput('任务名称: ')
    if (!name.trim()) {
      console.log('❌ 任务名称不能为空')
      return
    }

    const description = await getInput('任务描述 (可选): ')

    // 选择优先级
    console.log('\n⚡ 选择优先级:')
    console.log('  1. 低优先级')
    console.log('  2. 普通优先级')
    console.log('  3. 高优先级')
    console.log('  4. 紧急优先级')

    const priorityChoice = await getInput('请选择优先级 (1-4, 默认2): ') || '2'
    const priorityMap = { 1: 'low', 2: 'normal', 3: 'high', 4: 'urgent' } as const
    const priority = priorityMap[priorityChoice as keyof typeof priorityMap] || 'normal'

    const estimatedMinutes = await getInput('预计执行时间 (分钟, 可选): ')
    const estimatedDuration = estimatedMinutes ? Number(estimatedMinutes) * 60000 : undefined

    // 创建任务
    const task = taskManager.createTask({
      name: name.trim(),
      status: 'pending',
      priority,
      estimatedDuration,
      metadata: {
        description: description.trim() || '',
        createdBy: 'user',
      },
    })

    console.log('\n✅ 任务创建成功！')
    console.log(`🆔 任务ID: ${task.id}`)
    console.log(`📝 任务名称: ${task.name}`)
    console.log(`⚡ 优先级: ${priority}`)

    // 询问是否立即开始
    const startNow = await getInput('\n是否立即开始执行？(y/N): ')
    if (startNow.toLowerCase() === 'y' || startNow.toLowerCase() === 'yes') {
      await simulateTaskExecution(task.id)
    }

    // 更新全局状态
    globalStateManager.updateTasksState({
      queueSize: taskManager.getStats().totalTasks,
      runningTasks: taskManager.getStats().runningTasks,
    })
  }
  catch (error) {
    console.error('❌ 创建任务失败:', error)
  }
}

export async function executeTaskControl(): Promise<void> {
  const tasks = taskManager.getAllTasks()
  const activeOrPendingTasks = tasks.filter(t => ['running', 'pending', 'paused'].includes(t.status))

  if (activeOrPendingTasks.length === 0) {
    console.log('💭 没有可控制的任务')
    return
  }

  console.log('🎮 任务控制')
  console.log('\n选择要控制的任务:')

  activeOrPendingTasks.forEach((task, index) => {
    const statusIcon = {
      running: '🏃',
      pending: '⏳',
      paused: '⏸️',
      completed: '✅',
      failed: '❌',
    }[task.status] || '❓'

    console.log(`  ${index + 1}. ${statusIcon} ${task.name}`)
    console.log(`     状态: ${task.status} | 进度: ${task.progress}%`)
  })

  const choice = await getInput(`\n请选择任务 (1-${activeOrPendingTasks.length}): `)
  const index = Number.parseInt(choice) - 1

  if (index < 0 || index >= activeOrPendingTasks.length) {
    console.log('❌ 无效选择')
    return
  }

  const task = activeOrPendingTasks[index]

  console.log(`\n🎯 控制任务: ${task.name}`)
  console.log('  1. ⏸️  暂停任务')
  console.log('  2. ▶️  恢复/开始任务')
  console.log('  3. ⏹️  取消任务')
  console.log('  4. 📊 查看详情')

  const action = await getInput('请选择操作 (1-4): ')

  switch (action) {
    case '1':
      if (taskManager.pauseTask(task.id)) {
        console.log('✅ 任务已暂停')
      }
      else {
        console.log('❌ 无法暂停该任务')
      }
      break

    case '2':
      if (task.status === 'paused' && taskManager.resumeTask(task.id)) {
        console.log('✅ 任务已恢复')
      }
      else if (task.status === 'pending') {
        console.log('🚀 开始执行任务...')
        await simulateTaskExecution(task.id)
      }
      else {
        console.log('❌ 无法开始/恢复该任务')
      }
      break

    case '3': {
      const confirm = await getInput('⚠️  确认取消任务？(y/N): ')
      if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
        if (taskManager.cancelTask(task.id)) {
          console.log('✅ 任务已取消')
        }
        else {
          console.log('❌ 无法取消该任务')
        }
      }
      break
    }

    case '4':
      await displayTaskDetails(task)
      break

    default:
      console.log('❌ 无效操作')
  }

  // 更新全局状态
  globalStateManager.updateTasksState({
    queueSize: taskManager.getStats().totalTasks,
    runningTasks: taskManager.getStats().runningTasks,
  })
}

export async function executeTaskHistory(): Promise<void> {
  console.log('📚 任务历史记录')

  const allTasks = taskManager.getAllTasks()
  const completedTasks = allTasks.filter(t => t.status === 'completed')
  const failedTasks = allTasks.filter(t => t.status === 'failed')

  console.log(`\n📊 历史统计:`)
  console.log(`  已完成任务: ${completedTasks.length}`)
  console.log(`  失败任务: ${failedTasks.length}`)

  if (completedTasks.length > 0) {
    const totalDuration = completedTasks
      .filter(t => t.actualDuration)
      .reduce((sum, t) => sum + (t.actualDuration || 0), 0)
    const avgDuration = totalDuration / completedTasks.length
    console.log(`  平均执行时间: ${Math.round(avgDuration / 60000)} 分钟`)
  }

  if (allTasks.length === 0) {
    console.log('\n💭 暂无历史记录')
    return
  }

  // 显示最近的任务
  console.log('\n📋 最近完成的任务:')
  allTasks
    .filter(t => ['completed', 'failed'].includes(t.status))
    .slice(0, 10)
    .forEach((task, index) => {
      const statusIcon = task.status === 'completed' ? '✅' : '❌'
      const duration = task.actualDuration ? ` (${Math.round(task.actualDuration / 60000)}min)` : ''

      console.log(`  ${index + 1}. ${statusIcon} ${task.name}${duration}`)
      console.log(`     完成时间: ${task.completedAt?.toLocaleString()}`)

      if (task.error) {
        console.log(`     错误原因: ${task.error}`)
      }
    })
}

export async function executeTaskStats(): Promise<void> {
  console.log('📊 任务统计分析')

  const stats = taskManager.getStats()
  const allTasks = taskManager.getAllTasks()

  console.log('\n📋 总体统计:')
  console.log(`  总任务数: ${stats.totalTasks}`)
  console.log(`  等待中: ${stats.pendingTasks}`)
  console.log(`  运行中: ${stats.runningTasks}`)
  console.log(`  已完成: ${stats.completedTasks}`)
  console.log(`  失败: ${stats.failedTasks}`)
  console.log(`  暂停: ${stats.pausedTasks}`)

  // 成功率
  const totalFinished = stats.completedTasks + stats.failedTasks
  if (totalFinished > 0) {
    const successRate = (stats.completedTasks / totalFinished * 100).toFixed(1)
    console.log(`  成功率: ${successRate}%`)
  }

  // 优先级分布
  const priorityStats = allTasks.reduce((acc, task) => {
    acc[task.priority] = (acc[task.priority] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (Object.keys(priorityStats).length > 0) {
    console.log('\n⚡ 优先级分布:')
    Object.entries(priorityStats).forEach(([priority, count]) => {
      const icon = priority === 'urgent' ? '🔥' : priority === 'high' ? '⚡' : priority === 'low' ? '🐌' : '📝'
      console.log(`  ${icon} ${priority}: ${count} 个任务`)
    })
  }

  // 更新全局状态
  globalStateManager.updateTasksState({
    queueSize: stats.totalTasks,
    runningTasks: stats.runningTasks,
  })
}

// 显示任务详情
async function displayTaskDetails(task: TaskInfo): Promise<void> {
  console.log(`\n🔍 任务详情: ${task.name}`)
  console.log('─'.repeat(50))

  console.log(`📝 基本信息:`)
  console.log(`  任务ID: ${task.id}`)
  console.log(`  名称: ${task.name}`)
  console.log(`  状态: ${task.status}`)
  console.log(`  优先级: ${task.priority}`)
  console.log(`  进度: ${task.progress}%`)
  console.log(`  创建时间: ${task.createdAt.toLocaleString()}`)

  if (task.startedAt) {
    console.log(`  开始时间: ${task.startedAt.toLocaleString()}`)
  }

  if (task.completedAt) {
    console.log(`  完成时间: ${task.completedAt.toLocaleString()}`)
  }

  if (task.estimatedDuration) {
    console.log(`  预计时长: ${Math.round(task.estimatedDuration / 60000)} 分钟`)
  }

  if (task.actualDuration) {
    console.log(`  实际时长: ${Math.round(task.actualDuration / 60000)} 分钟`)
  }

  if (task.accountId) {
    console.log(`  关联账户: ${task.accountId}`)
  }

  if (task.scriptId) {
    console.log(`  关联脚本: ${task.scriptId}`)
  }

  if (task.error) {
    console.log(`\n❌ 错误信息:`)
    console.log(`  ${task.error}`)
  }

  if (task.metadata.description) {
    console.log(`\n📖 描述:`)
    console.log(`  ${task.metadata.description}`)
  }
}

// 模拟任务执行
async function simulateTaskExecution(taskId: string): Promise<void> {
  const task = taskManager.getTask(taskId)
  if (!task)
    return

  taskManager.updateTask(taskId, {
    status: 'running',
    startedAt: new Date(),
  })

  console.log(`🚀 开始执行任务: ${task.name}`)

  // 模拟进度更新
  for (let progress = 0; progress <= 100; progress += 20) {
    taskManager.updateTask(taskId, { progress })
    console.log(`⏳ 执行进度: ${progress}%`)

    // 模拟执行时间
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const actualDuration = Date.now() - (task.startedAt?.getTime() || Date.now())

  taskManager.updateTask(taskId, {
    status: 'completed',
    progress: 100,
    completedAt: new Date(),
    actualDuration,
  })

  console.log(`✅ 任务执行完成: ${task.name}`)
}

// 创建任务管理命令
export const taskCommand = new Command('task')
  .description('任务队列管理')

taskCommand
  .command('list')
  .alias('ls')
  .description('显示任务队列')
  .action(executeTaskList)

taskCommand
  .command('create')
  .alias('new')
  .description('创建新任务')
  .action(executeTaskCreate)

taskCommand
  .command('control')
  .alias('manage')
  .description('控制任务执行')
  .action(executeTaskControl)

taskCommand
  .command('history')
  .alias('hist')
  .description('查看任务历史')
  .action(executeTaskHistory)

taskCommand
  .command('stats')
  .description('显示任务统计')
  .action(executeTaskStats)

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
