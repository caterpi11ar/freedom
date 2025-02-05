# @freedom/scripts

`@freedom/scripts` provides a set of interfaces for writing automation scripts to control the game flow. It allows users to automatically perform a series of predefined actions in the game, such as clicking, waiting for elements, executing custom logic, etc. Through integration with `@freedom/executor`, users can easily automate interactions in cloud games.
s

## Usage

```ts
import type { Game } from '@freedom/core'
import Executor from '@freedom/executor'

/** login */
export async function login(game: Game) {
  const scripts = new Executor(game, {
    name: 'login',
    actions: [
      {
        name: 'save cookies',
        callback: async (game) => {
          const cookies = await game.browser().cookies()
          // save your cookies
        },
      },
    ],
  })

  await scripts.execute()
}
```
