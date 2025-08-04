import { App } from '@freedom/core'
import { login, start } from './start'

async function main() {
  const app = new App()

  await app.launch({ headless: false })

  const game = await app.new()

  await login(game)

  await start(game)
}

main()
