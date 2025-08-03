import type { Game } from '@freedom/core'
import { Executor } from '@freedom/executor'
import {
  enterGameAction,
  firstBootAction,
  networkSpeedTestAction,
  saveCookiesAction,
  waitingInLineAction,
  waitLoginAction,
} from './actions'

/**
 * 登录操作
 * @param game 游戏实例
 */
export async function login(game: Game): Promise<void> {
  const scripts = new Executor(game, {
    name: '登录',
    actions: [saveCookiesAction],
  })

  await scripts.execute()
}

/**
 * 进入游戏
 * @param game 游戏实例
 */
export async function start(game: Game): Promise<void> {
  const scripts = new Executor(game, {
    name: '启动游戏',
    actions: [
      waitLoginAction,
      firstBootAction,
      networkSpeedTestAction,
      waitingInLineAction,
      enterGameAction,
    ],
  })

  await scripts.execute()
}
