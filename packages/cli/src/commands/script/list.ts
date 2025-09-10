import type { CommandModule } from 'yargs'

// 列出可用脚本命令
import process from 'node:process'
import chalk from 'chalk'

export const listCommand: CommandModule = {
  command: 'list',
  describe: 'List available scripts',
  builder: yargs =>
    yargs
      .option('format', {
        alias: 'f',
        describe: 'Output format',
        type: 'string',
        choices: ['table', 'json', 'plain'],
        default: 'table',
      })
      .option('filter', {
        describe: 'Filter scripts by pattern',
        type: 'string',
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.blue('📋 Available scripts:'))

      // TODO: 集成 @freedom/core 的脚本发现逻辑
      // const scriptService = new ScriptService()
      // const scripts = await scriptService.listScripts(argv.filter)
      // await displayScripts(scripts, argv.format)

      console.log(chalk.gray(`Format: ${argv.format}`))
      if (argv.filter) {
        console.log(chalk.gray(`Filter: ${argv.filter}`))
      }

      console.log(chalk.yellow('⚠️  Script listing not yet implemented'))
      console.log(chalk.cyan('💡 Run "freedom script create <name>" to create your first script'))
    }
    catch (error) {
      console.error(chalk.red('❌ Failed to list scripts:', error instanceof Error ? error.message : 'Unknown error'))
      process.exit(1)
    }
  },
}
