import type { Game } from '@freedom/executor'
import Executor from '@freedom/executor'

/** login */
export async function login(game: Game) {
  const scripts = new Executor(game, {
    name: 'login',
    actions: [
      {
        name: 'save cookies',
        callback: async (game) => {
          await game.browser().cookies()
        },
      },
    ],
  })

  await scripts.execute()
}

/**
 * Enter the game
 * @param game Game
 */
export async function start(game: Game) {
  const scripts = new Executor(game, {
    name: 'start',
    actions: [
      {
        name: 'wait login',
        callback: async (game) => {
          const selector = '.wel-card__content--start'
          const timeout = 5000
          const element = await game.waitForSelector(selector, { timeout })

          return element
        },
      },
      {
        name: 'first boot',
        callback: async (game) => {
          const selector = 'van-action-bar-button--first'
          const timeout = 5000
          try {
            const element = await game.waitForSelector(selector, { timeout })
            if (element)
              await element.click()
          }
          catch {}
        },
      },
      {
        name: 'Network speed test',
        callback: async (game) => {
          const selector = 'cancel'
          const timeout = 5000
          try {
            const element = await game.waitForSelector(selector, { timeout })
            if (element)
              await element.click()
          }
          catch {}
        },
      },
      {
        name: 'Waiting in line',
        callback: async (game, actionsReturn) => {
          const selector = '.game-player__video'
          const timeout = 600000

          const element = actionsReturn[0]
          await element?.click()
          await game.waitForSelector(selector, { timeout })
        },
      },
      {
        name: 'Enter the game',
        callback: async (game) => {
          /**
           * @description 根据间隔执行回调函数若干次
           * @param interval 间隔时间
           * @param times 执行次数
           * @param callback 回调函数
           */
          async function timedFunction(
            interval: number,
            times: number,
            callback: (count: number) => void,
          ) {
            return new Promise<void>((resolve) => {
              let count: number = 0
              const intervalId = setInterval(async () => {
                if (count < times) {
                  callback(count)
                  count++
                }
                else {
                  clearInterval(intervalId)
                  resolve()
                }
              }, interval)
            })
          }

          const interval = 5000
          const x = 500
          const y = 390
          const times = 15

          await timedFunction(interval, times, async () => {
            await game.mouse.click(x, y)
          })
        },
      },
    ],
  })

  await scripts.execute()
}
