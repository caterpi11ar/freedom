// 游戏控制命令组
import type { CommandModule } from 'yargs'
import chalk from 'chalk'
import { restartCommand } from './game/restart.js'
import { startCommand } from './game/start.js'
import { statusCommand } from './game/status.js'
import { stopCommand } from './game/stop.js'

export const gameCommand: CommandModule = {
  command: 'game <command>',
  describe: 'Manage game automation sessions',
  builder: yargs =>
    yargs
      .command(startCommand)
      .command(stopCommand)
      .command(statusCommand)
      .command(restartCommand)
      .demandCommand(1, chalk.red('You need to specify a game command.'))
      .help(),
  handler: () => {
    // 这个处理器在有子命令时不会被调用
  },
}
