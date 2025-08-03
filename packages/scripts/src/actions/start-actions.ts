import type { Action } from '@freedom/executor'
import { timedFunction } from '../utils/timed-function'

/**
 * 等待登录页面的操作
 */
export const waitLoginAction: Action = {
  name: '等待登录页面',
  callback: async (context) => {
    const selector = '.wel-card__content--start'
    const timeout = 5000
    const element = await context.game.waitForSelector(selector, { timeout })
    return element
  },
}

/**
 * 首次启动操作
 */
export const firstBootAction: Action = {
  name: '首次启动',
  callback: async (context) => {
    const selector = 'van-action-bar-button--first'
    const timeout = 5000
    try {
      const element = await context.game.waitForSelector(selector, { timeout })
      if (element)
        await element.click()
    }
    catch {}
  },
}

/**
 * 网络测速操作
 */
export const networkSpeedTestAction: Action = {
  name: '网络测速',
  callback: async (context) => {
    const selector = 'cancel'
    const timeout = 5000
    try {
      const element = await context.game.waitForSelector(selector, { timeout })
      if (element)
        await element.click()
    }
    catch {}
  },
}

/**
 * 等待排队操作
 */
export const waitingInLineAction: Action = {
  name: '等待排队',
  callback: async (context) => {
    const selector = '.game-player__video'
    const timeout = 600000

    const element = context.results[0]
    await element?.click()
    await context.game.waitForSelector(selector, { timeout })
  },
}

/**
 * 进入游戏操作
 */
export const enterGameAction: Action = {
  name: '进入游戏',
  callback: async (context) => {
    const interval = 5000
    const x = 500
    const y = 390
    const times = 15

    await timedFunction(interval, times, async () => {
      await context.game.mouse.click(x, y)
    })
  },
}
