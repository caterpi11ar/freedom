// 删除脚本命令
import type { CommandModule } from 'yargs'
import chalk from 'chalk'
import { GameAutomationError } from '../../utils/errors.js'

export const deleteCommand: CommandModule = {
  command: 'delete <name>',
  describe: 'Delete a script',
  builder: yargs =>
    yargs
      .positional('name', {
        describe: 'Name of the script to delete',
        type: 'string',
        demandOption: true,
      })
      .option('force', {
        alias: 'f',
        describe: 'Force deletion without confirmation',
        type: 'boolean',
        default: false,
      })
      .option('backup', {
        alias: 'b',
        describe: 'Create backup before deletion',
        type: 'boolean',
        default: true,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.red(`🗑️  Deleting script: ${argv.name}`))
      console.log(chalk.gray(`Force: ${argv.force ? 'Yes' : 'No'}`))
      console.log(chalk.gray(`Backup: ${argv.backup ? 'Yes' : 'No'}`))

      // TODO: 集成 @freedom/core 的脚本删除功能
      // const scriptService = new ScriptService()
      // const scriptExists = await scriptService.scriptExists(argv.name)
      //
      // if (!scriptExists) {
      //   throw new GameAutomationError(`Script "${argv.name}" not found`)
      // }
      //
      // if (!argv.force) {
      //   const confirm = await promptConfirmation(`Are you sure you want to delete "${argv.name}"?`)
      //   if (!confirm) {
      //     console.log(chalk.yellow('Operation cancelled'))
      //     return
      //   }
      // }
      //
      // if (argv.backup) {
      //   await scriptService.backupScript(argv.name)
      //   console.log(chalk.green('✅ Backup created'))
      // }
      //
      // await scriptService.deleteScript(argv.name)
      // console.log(chalk.green(`✅ Script "${argv.name}" deleted successfully`))

      console.log(chalk.yellow('⚠️  Script deletion not yet implemented'))
      console.log(chalk.cyan('💡 Use "freedom script list" to see available scripts'))
    }
    catch (error) {
      if (error instanceof Error) {
        throw new GameAutomationError(`Script deletion failed: ${error.message}`)
      }
      throw new GameAutomationError('Script deletion failed: Unknown error')
    }
  },
}
