// 扩展管理命令组
import type { CommandModule } from 'yargs'
import chalk from 'chalk'
import { disableCommand } from './extension/disable.js'
import { enableCommand } from './extension/enable.js'
import { installCommand } from './extension/install.js'
import { listCommand } from './extension/list.js'
import { uninstallCommand } from './extension/uninstall.js'

export const extensionCommand: CommandModule = {
  command: 'extension <command>',
  describe: 'Manage Freedom extensions',
  builder: yargs =>
    yargs
      .command(listCommand)
      .command(installCommand)
      .command(uninstallCommand)
      .command(enableCommand)
      .command(disableCommand)
      .demandCommand(1, chalk.red('You need to specify an extension command.'))
      .help(),
  handler: () => {
    // 这个处理器在有子命令时不会被调用
  },
}
