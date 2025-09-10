// 脚本管理命令组
import type { CommandModule } from 'yargs'
import chalk from 'chalk'
import { createCommand } from './script/create.js'
import { deleteCommand } from './script/delete.js'
import { editCommand } from './script/edit.js'
import { listCommand } from './script/list.js'
import { runCommand } from './script/run.js'

export const scriptCommand: CommandModule = {
  command: 'script <command>',
  describe: 'Manage automation scripts',
  builder: yargs =>
    yargs
      .command(listCommand)
      .command(runCommand)
      .command(createCommand)
      .command(editCommand)
      .command(deleteCommand)
      .demandCommand(1, chalk.red('You need to specify a script command.'))
      .help(),
  handler: () => {
    // 这个处理器在有子命令时不会被调用
  },
}
