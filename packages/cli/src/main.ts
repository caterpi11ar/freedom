// 主程序入口 - yargs 架构
import process from 'node:process'
import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { configCommand } from './commands/config.js'
import { debugCommand } from './commands/debug.js'
import { extensionCommand } from './commands/extension.js'
import { gameCommand } from './commands/game.js'
import { scriptCommand } from './commands/script.js'
import { InteractiveMode } from './interactive.js'

function displayLogo(): void {
  console.log(chalk.cyan.bold(`
 ███████╗██████╗ ███████╗███████╗██████╗  ██████╗ ███╗   ███╗
 ██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗██╔═══██╗████╗ ████║
 █████╗  ██████╔╝█████╗  █████╗  ██║  ██║██║   ██║██╔████╔██║
 ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██║  ██║██║   ██║██║╚██╔╝██║
 ██║     ██║  ██║███████╗███████╗██████╔╝╚██████╔╝██║ ╚═╝ ██║
 ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚═════╝  ╚═════╝ ╚═╝     ╚═╝
  `))
  console.log(chalk.yellow('🎮 Freedom - Genshin Impact Automation Tool'))
  console.log(chalk.gray(`Version: ${process.env.CLI_VERSION || '0.1.0'}\n`))
}

export async function main(): Promise<void> {
  displayLogo()

  const args = hideBin(process.argv)

  // 如果没有参数，进入交互式模式
  if (args.length === 0) {
    console.log(chalk.blue('💡 进入交互式模式...'))
    console.log(chalk.gray('输入 /help 查看可用命令\n'))

    const interactive = new InteractiveMode()
    await interactive.start()
    return
  }

  // 使用 yargs 处理命令
  const cli = yargs(args)
    .scriptName('freedom')
    .usage('$0 <command> [options]')
    .command(gameCommand)
    .command(scriptCommand)
    .command(configCommand)
    .command(extensionCommand)
    .command(debugCommand)
    .demandCommand(1, chalk.red('You need to specify a command.'))
    .help('help', 'Show help information')
    .alias('help', 'h')
    .version('version', 'Show version information', process.env.CLI_VERSION || '0.1.0')
    .alias('version', 'v')
    .recommendCommands()
    .strict()
    .wrap(Math.min(120, process.stdout.columns || 80))

  try {
    await cli.argv
  }
  catch (error) {
    console.error(chalk.red('❌ Command execution failed:'), error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
