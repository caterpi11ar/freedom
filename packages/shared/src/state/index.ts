/**
 * 共享状态模块入口
 * 导出所有状态相关的类型和实例
 */

// 便捷的状态访问函数
export { createStateBridge } from './bridge'
export { globalState as default } from './store'
export { globalState } from './store'

export type {
  AppState,
  AuthState,
  BrowserState,
  ConfigState,
  HealthState,
  ServiceState,
  StateBridge,
  StateListener,
  StateUpdateEvent,
  TaskInfo,
  TaskState,
} from './types'
