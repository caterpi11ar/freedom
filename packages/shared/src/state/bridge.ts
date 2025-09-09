import type { StateBridge } from './types'
import { globalState } from './store'

/**
 * 创建状态桥接器
 * 为各个模块提供状态访问接口
 */
export function createStateBridge(): StateBridge {
  return {
    getState: () => globalState.getState(),
    getSlice: key => globalState.getSlice(key),
    updateState: event => globalState.updateState(event),
    subscribe: listener => globalState.subscribe(listener),
  }
}

/**
 * 获取默认状态桥接器实例
 */
export const defaultBridge = createStateBridge()
