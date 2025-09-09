import chalk from 'chalk'
import { Command } from 'commander'
import { CLIStateBridge } from '../state/bridge'

/**
 * 格式化时间
 */
function formatTime(date?: Date): string {
  if (!date)
    return chalk.gray('未知')
  return chalk.cyan(date.toLocaleString())
}

/**
 * 格式化运行时间
 */
function formatUptime(seconds?: number): string {
  if (!seconds)
    return chalk.gray('0秒')

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return chalk.cyan(`${hours}小时${minutes}分钟${secs}秒`)
  }
  else if (minutes > 0) {
    return chalk.cyan(`${minutes}分钟${secs}秒`)
  }
  else {
    return chalk.cyan(`${secs}秒`)
  }
}

/**
 * 获取服务状态人脸emoji和描述
 */
function getServiceStatusDisplay(service: any) {
  switch (service.status) {
    case 'running': {
      const uptime = service.uptime || 0
      if (uptime > 3600)
        return { icon: '🤩', text: '长期稳定运行', color: chalk.green }
      if (uptime > 1800)
        return { icon: '😎', text: '持续运行中', color: chalk.green }
      if (uptime > 300)
        return { icon: '😄', text: '运行良好', color: chalk.green }
      return { icon: '🙂', text: '刚刚启动', color: chalk.green }
    }

    case 'starting': {
      const startingFaces = ['😌', '🤔', '😏', '🙃']
      const face = startingFaces[Math.floor(Math.random() * startingFaces.length)]
      return { icon: face, text: '正在启动...', color: chalk.yellow }
    }

    case 'stopping': {
      const stoppingFaces = ['😴', '🥱', '😪', '😑']
      const stopFace = stoppingFaces[Math.floor(Math.random() * stoppingFaces.length)]
      return { icon: stopFace, text: '正在停止...', color: chalk.yellow }
    }

    case 'error': {
      const errorFaces = ['😱', '😤', '🤬', '😵', '🤯']
      const errFace = errorFaces[Math.floor(Math.random() * errorFaces.length)]
      return { icon: errFace, text: '服务异常', color: chalk.red }
    }

    default: {
      const idleFaces = ['😴', '😪', '🥱', '😌', '🙃']
      const idleFace = idleFaces[Math.floor(Math.random() * idleFaces.length)]
      return { icon: idleFace, text: '服务已停止', color: chalk.gray }
    }
  }
}

/**
 * 显示服务状态
 */
function displayServiceStatus(service: any): void {
  console.log(chalk.blue('🎛️ 服务控制台'))

  const status = getServiceStatusDisplay(service)
  console.log(`  ${status.icon} 状态: ${status.color(status.text)}`)

  if (service.lastStartTime) {
    console.log(`  ⏰ 启动时间: ${formatTime(service.lastStartTime)}`)
  }
  if (service.uptime) {
    console.log(`  ⏱️ 运行时长: ${formatUptime(service.uptime)}`)
  }
  if (service.pid) {
    console.log(`  🔢 进程ID: ${chalk.cyan(service.pid)}`)
  }
  if (service.error) {
    console.log(`  📝 错误信息: ${chalk.red(service.error)}`)
  }
  console.log()
}

/**
 * 获取任务状态人脸emoji
 */
function getTaskStatusEmoji(tasks: any) {
  const activeCount = Array.isArray(tasks.active) ? tasks.active.length : tasks.active || 0

  if (activeCount >= 5)
    return '🤯' // 超负荷工作
  if (activeCount >= 3)
    return '😤' // 忙碌中
  if (activeCount >= 2)
    return '🧐' // 专注工作
  if (activeCount >= 1)
    return '😊' // 轻松工作
  if (tasks.totalCompleted > 0)
    return '😌' // 有完成记录
  return '🙂' // 空闲状态
}

/**
 * 显示任务状态
 */
function displayTaskStatus(tasks: any): void {
  const taskEmoji = getTaskStatusEmoji(tasks)
  const activeCount = Array.isArray(tasks.active) ? tasks.active.length : tasks.active || 0

  console.log(chalk.blue(`${taskEmoji} 任务工作台`))

  // 活跃任务显示
  if (activeCount > 0) {
    console.log(`  ⚡ 活跃任务: ${chalk.blue(activeCount)} 个`)
    if (Array.isArray(tasks.active)) {
      tasks.active.slice(0, 3).forEach((task: any, index: number) => {
        const progress = task.progress ? `${Math.round(task.progress)}%` : '进行中'
        console.log(`    ${index + 1}. 🔹 ${chalk.cyan(task.name)} - ${chalk.yellow(progress)}`)
      })
      if (tasks.active.length > 3) {
        console.log(`    ... 还有 ${tasks.active.length - 3} 个任务`)
      }
    }
  }
  else {
    console.log(`  😴 活跃任务: ${chalk.gray('无')}`)
  }

  // 统计信息
  console.log(`  🎯 已完成: ${chalk.green(tasks.totalCompleted || 0)} 个`)
  console.log(`  💥 已失败: ${chalk.red(tasks.totalFailed || 0)} 个`)

  // 最近任务
  const lastCompleted = tasks.completed && tasks.completed[tasks.completed.length - 1]
  const lastFailed = tasks.failed && tasks.failed[tasks.failed.length - 1]

  if (lastCompleted) {
    console.log(`  🏆 最近完成: ${chalk.cyan(lastCompleted.name)}`)
  }
  if (lastFailed) {
    console.log(`  ❌ 最近失败: ${chalk.red(lastFailed.name)}`)
  }

  console.log()
}

/**
 * 显示健康状态
 */
function displayHealthStatus(health: any, browser: any): void {
  console.log(chalk.blue('🏥 系统健康'))

  // 网络状态 - 用人脸表情
  let networkColor
  let networkFace
  let networkText
  switch (health.networkStatus) {
    case 'online':
      networkColor = chalk.green
      networkFace = '😊'
      networkText = '网络畅通'
      break
    case 'unstable':
      networkColor = chalk.yellow
      networkFace = '😟'
      networkText = '网络不稳定'
      break
    default:
      networkColor = chalk.red
      networkFace = '😵‍💫'
      networkText = '网络离线'
  }
  console.log(`  ${networkFace} 网络: ${networkColor(networkText)}`)

  // 浏览器连接
  const browserFace = browser?.isConnected ? '😄' : '😐'
  const browserColor = browser?.isConnected ? chalk.green : chalk.red
  const browserText = browser?.isConnected ? '浏览器已连接' : '浏览器未连接'
  console.log(`  ${browserFace} 浏览器: ${browserColor(browserText)}`)

  // 性能状态
  if (health.performance) {
    const { cpu, memory } = health.performance
    if (cpu !== undefined) {
      const cpuFace = cpu > 80 ? '🥵' : cpu > 50 ? '😅' : '😌'
      console.log(`  ${cpuFace} CPU: ${chalk.cyan(cpu)}%`)
    }
    if (memory !== undefined) {
      const memoryFace = memory > 80 ? '🤯' : memory > 50 ? '🤔' : '😊'
      console.log(`  ${memoryFace} 内存: ${chalk.cyan(memory)}%`)
    }
  }

  if (health.lastHealthCheck) {
    console.log(`  ⏰ 检查时间: ${formatTime(health.lastHealthCheck)}`)
  }
  console.log()
}

/**
 * 显示配置状态
 */
function displayConfigStatus(config: any): void {
  console.log(chalk.blue('⚙️ 配置信息'))
  console.log(`  无头模式: ${config.headless ? chalk.green('是') : chalk.yellow('否')}`)
  console.log(`  超时时间: ${chalk.cyan(config.timeout)}秒`)
  console.log(`  重试次数: ${chalk.cyan(config.retryCount)}次`)
  console.log()
}

export const statusCommand = new Command('status')
  .description('📊 显示系统状态')
  .option('-s, --service', '只显示服务状态')
  .option('-t, --tasks', '只显示任务状态')
  .option('-h, --health', '只显示健康状态')
  .option('-c, --config', '只显示配置状态')
  .action((options) => {
    const state = CLIStateBridge.getState()

    console.log(chalk.cyan('🎮 Freedom 系统状态'))
    console.log()

    // 根据选项显示特定状态
    if (options.service) {
      displayServiceStatus(state.service)
    }
    else if (options.tasks) {
      displayTaskStatus(state.tasks)
    }
    else if (options.health) {
      displayHealthStatus(state.health, state.browser)
    }
    else if (options.config) {
      displayConfigStatus(state.config)
    }
    else {
      // 显示所有状态
      displayServiceStatus(state.service)
      displayTaskStatus(state.tasks)
      displayHealthStatus(state.health, state.browser)
      displayConfigStatus(state.config)
    }
  })
