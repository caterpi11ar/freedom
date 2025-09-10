// 停止游戏会话命令
import type { CommandModule } from 'yargs'
import chalk from 'chalk'
import { GameAutomationError } from '../../utils/errors.js'

export const stopCommand: CommandModule = {
  command: 'stop',
  describe: 'Stop the current game automation session',
  builder: yargs =>
    yargs
      .option('force', {
        alias: 'f',
        describe: 'Force stop without saving current progress',
        type: 'boolean',
        default: false,
      })
      .option('save', {
        alias: 's',
        describe: 'Save current session state before stopping',
        type: 'boolean',
        default: true,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.red('🛑 Stopping game automation session...'))

      if (argv.save && !argv.force) {
        console.log(chalk.blue('💾 Saving session state...'))
      }

      if (argv.force) {
        console.log(chalk.yellow('⚡ Force stopping (progress may be lost)...'))
      }

      // TODO: 集成 @freedom/core 的游戏停止逻辑
      // const gameService = getGameService()
      // await gameService.stop({ force: argv.force, save: argv.save })

      console.log(chalk.yellow('⚠️  Game stop functionality not yet implemented'))
      console.log(chalk.green('✅ Session stopped successfully (simulated)'))
    }
    catch (error) {
      if (error instanceof Error) {
        throw new GameAutomationError(`Failed to stop game session: ${error.message}`)
      }
      throw new GameAutomationError('Failed to stop game session: Unknown error')
    }
  },
}
