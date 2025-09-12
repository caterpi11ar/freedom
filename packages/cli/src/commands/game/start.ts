// 启动游戏会话命令
import type { CommandModule } from 'yargs'
import { getConfigValue } from '@freedom/shared/config'
import chalk from 'chalk'
import { GameAutomationError } from '../../utils/errors.js'

export const startCommand: CommandModule = {
  command: 'start [profile]',
  describe: 'Start a game automation session',
  builder: yargs =>
    yargs
      .positional('profile', {
        describe: 'Game profile to use',
        type: 'string',
        default: 'default',
      })
      .option('headless', {
        alias: 'h',
        describe: 'Run in headless mode',
        type: 'boolean',
        default: getConfigValue('automation.headless'),
      })
      .option('url', {
        alias: 'u',
        describe: 'Game URL to navigate to',
        type: 'string',
        default: getConfigValue('game.url'),
      })
      .option('region', {
        alias: 'r',
        describe: 'Game region',
        type: 'string',
        choices: ['cn', 'global'],
        default: getConfigValue('game.region'),
      })
      .option('timeout', {
        alias: 't',
        describe: 'Session timeout in seconds',
        type: 'number',
        default: getConfigValue('automation.timeout'),
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.green('🎮 Starting game automation session...'))
      console.log(chalk.gray(`Profile: ${argv.profile}`))
      console.log(chalk.gray(`Region: ${argv.region}`))
      console.log(chalk.gray(`Headless: ${argv.headless ? 'Yes' : 'No'}`))
      console.log(chalk.gray(`URL: ${argv.url}`))
      console.log(chalk.gray(`Timeout: ${argv.timeout}ms`))

      // TODO: 集成 @freedom/core 的游戏启动逻辑
      // const gameService = new GameService(argv)
      // await gameService.start()

      console.log(chalk.yellow('⚠️  Game automation core not yet implemented'))
      console.log(chalk.cyan('💡 Run "freedom debug doctor" to check system requirements'))
    }
    catch (error) {
      if (error instanceof Error) {
        throw new GameAutomationError(`Failed to start game session: ${error.message}`)
      }
      throw new GameAutomationError('Failed to start game session: Unknown error')
    }
  },
}
