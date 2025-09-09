/**
 * CLI模块的状态桥接器
 * 连接到@packages/shared的全局状态
 */

import type { AppState, StateUpdateEvent } from '@freedom/shared'
import process from 'node:process'
import { createStateBridge } from '@freedom/shared'

// 创建CLI专用的状态桥接器
export const cliState = createStateBridge()

/**
 * CLI特定的状态访问方法
 */
export class CLIStateBridge {
  /**
   * 获取当前完整状态
   */
  static getState(): AppState {
    return cliState.getState()
  }

  /**
   * 获取服务状态
   */
  static getServiceState() {
    return cliState.getSlice('service')
  }

  /**
   * 获取任务状态
   */
  static getTaskState() {
    return cliState.getSlice('tasks')
  }

  /**
   * 获取浏览器状态
   */
  static getBrowserState() {
    return cliState.getSlice('browser')
  }

  /**
   * 获取健康状态
   */
  static getHealthState() {
    return cliState.getSlice('health')
  }

  /**
   * 获取配置状态
   */
  static getConfigState() {
    return cliState.getSlice('config')
  }

  /**
   * 更新配置
   */
  static updateConfig(config: any) {
    cliState.updateState({
      type: 'config:update',
      config,
    })
  }

  /**
   * 订阅状态变化
   */
  static subscribe(listener: (state: AppState, event?: StateUpdateEvent) => void) {
    return cliState.subscribe(listener)
  }

  /**
   * 模拟服务状态变化（用于测试）
   */
  static simulateServiceStart() {
    cliState.updateState({
      type: 'service:start',
      pid: process.pid,
    })
  }

  static simulateServiceStop() {
    cliState.updateState({
      type: 'service:stop',
    })
  }

  /**
   * 模拟任务状态变化（用于测试）
   */
  static simulateTaskStart(taskName: string) {
    const taskId = `task-${Date.now()}`
    cliState.updateState({
      type: 'task:create',
      task: {
        id: taskId,
        name: taskName,
        type: 'automation',
        startTime: new Date(),
        status: 'pending',
      },
    })

    setTimeout(() => {
      cliState.updateState({
        type: 'task:start',
        taskId,
      })
    }, 100)
  }

  static simulateTaskComplete(taskName: string) {
    const state = this.getState()
    const activeTask = state.tasks.active.find(t => t.name === taskName)
    if (activeTask) {
      cliState.updateState({
        type: 'task:complete',
        taskId: activeTask.id,
      })
    }
  }
}
