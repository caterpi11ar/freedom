import type { AppState } from '@freedom/shared'
import chalk from 'chalk'

/**
 * 获取系统整体状态人脸emoji
 * 根据系统状态返回相应的人脸表情，让状态显示更加生动
 */
function getSystemStatusEmoji(state: AppState): string {
  // 优先级：错误 > 任务执行中 > 服务启动中 > 离线 > 正常运行 > 停止

  // 错误状态 - 痛苦/愤怒表情
  if (state.service.status === 'error') {
    const errorFaces = ['😱', '😤', '🤬', '😵', '💀', '🤯']
    return errorFaces[Math.floor(Math.random() * errorFaces.length)]
  }

  // 任务执行中 - 专注/忙碌表情
  if (state.tasks.active.length > 0) {
    const taskCount = state.tasks.active.length
    if (taskCount >= 5)
      return '🤯' // 超负荷工作
    if (taskCount >= 3)
      return '😤' // 忙碌中
    if (taskCount >= 2)
      return '🧐' // 专注工作
    return '😊' // 轻松工作
  }

  // 服务状态变化中 - 期待/准备表情
  if (state.service.status === 'starting') {
    const startingFaces = ['😌', '🤔', '😏', '🙃']
    return startingFaces[Math.floor(Math.random() * startingFaces.length)]
  }

  if (state.service.status === 'stopping') {
    const stoppingFaces = ['😴', '🥱', '😪', '😑']
    return stoppingFaces[Math.floor(Math.random() * stoppingFaces.length)]
  }

  // 网络状态 - 困惑/担心表情
  if (state.health.networkStatus === 'offline') {
    return '😵‍💫' // 网络离线 - 头晕
  }

  if (state.health.networkStatus === 'unstable') {
    return '😟' // 网络不稳定 - 担心
  }

  // 浏览器连接状态 - 疑惑表情
  if (state.service.status === 'running' && !state.browser.isConnected) {
    return '🤨' // 服务运行但浏览器未连接 - 疑惑
  }

  // 正常运行状态 - 开心表情
  if (state.service.status === 'running') {
    const uptime = state.service.uptime || 0
    if (uptime > 3600)
      return '🤩' // 长时间稳定运行 - 兴奋
    if (uptime > 1800)
      return '😎' // 中等时间运行 - 酷
    if (uptime > 300)
      return '😄' // 短时间运行 - 开心
    return '🙂' // 刚启动 - 微笑
  }

  // 停止状态 - 休息表情
  const idleFaces = ['😴', '😪', '🥱', '😌', '🙃']
  return idleFaces[Math.floor(Math.random() * idleFaces.length)]
}

/**
 * 生成动态提示符
 * 结合人脸emoji和颜色来显示当前系统状态
 */
export function generatePrompt(state: AppState): string {
  const statusEmoji = getSystemStatusEmoji(state)

  // 根据状态决定提示符颜色
  let promptColor = chalk.green
  if (state.service.status === 'error') {
    promptColor = chalk.red
  }
  else if (state.service.status === 'starting' || state.service.status === 'stopping') {
    promptColor = chalk.yellow
  }
  else if (state.tasks.active.length > 0) {
    promptColor = chalk.blue
  }

  return `${statusEmoji} ${promptColor('freedom> ')}`
}

/**
 * 生成状态变化通知
 * 当系统状态发生重要变化时显示通知信息
 */
export function generateStatusNotification(prevState: AppState, currentState: AppState): string | null {
  // 服务状态变化通知
  if (prevState.service.status !== currentState.service.status) {
    switch (currentState.service.status) {
      case 'running':
        return chalk.green('😊 服务已启动')
      case 'stopped':
        return chalk.yellow('😴 服务已停止')
      case 'error':
        return chalk.red(`😱 服务出错: ${currentState.service.error || '未知错误'}`)
    }
  }

  // 任务完成通知
  if (prevState.tasks.totalCompleted < currentState.tasks.totalCompleted) {
    const lastCompletedTask = currentState.tasks.completed[currentState.tasks.completed.length - 1]
    return chalk.green(`🎉 任务完成: ${lastCompletedTask?.name || '未知任务'}`)
  }

  // 任务失败通知
  if (prevState.tasks.totalFailed < currentState.tasks.totalFailed) {
    const lastFailedTask = currentState.tasks.failed[currentState.tasks.failed.length - 1]
    return chalk.red(`😞 任务失败: ${lastFailedTask?.name || '未知任务'}`)
  }

  return null
}
