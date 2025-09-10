// 调试工具命令组
import type { CommandModule } from 'yargs'
import chalk from 'chalk'
import { doctorCommand } from './debug/doctor.js'
import { logCommand } from './debug/log.js'
import { monitorCommand } from './debug/monitor.js'

export const debugCommand: CommandModule = {
  command: 'debug <command>',
  describe: 'Debug and diagnostic tools',
  builder: yargs =>
    yargs
      .command(logCommand)
      .command(doctorCommand)
      .command(monitorCommand)
      .demandCommand(1, chalk.red('You need to specify a debug command.'))
      .help(),
  handler: () => {
    // 这个处理器在有子命令时不会被调用
  },
}
