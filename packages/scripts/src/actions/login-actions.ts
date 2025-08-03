import type { Action } from '@freedom/executor'

/**
 * 保存 cookies 的操作
 */
export const saveCookiesAction: Action = {
  name: '保存 cookies',
  callback: async (context) => {
    await context.game.browser().cookies()
  },
}
