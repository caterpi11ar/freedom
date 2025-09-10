// 配置管理命令组
import type { CommandModule } from 'yargs'
import chalk from 'chalk'
import { getCommand } from './config/get.js'
import { listCommand } from './config/list.js'
import { resetCommand } from './config/reset.js'
import { setCommand } from './config/set.js'

export const configCommand: CommandModule = {
  command: 'config <command>',
  describe: 'Manage configuration settings',
  builder: yargs =>
    yargs
      .command(getCommand)
      .command(setCommand)
      .command(listCommand)
      .command(resetCommand)
      .demandCommand(1, chalk.red('You need to specify a config command.'))
      .help(),
  handler: () => {
    // 这个处理器在有子命令时不会被调用
  },
}
