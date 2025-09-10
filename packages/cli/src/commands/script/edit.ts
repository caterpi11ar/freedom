// 编辑脚本命令
import type { CommandModule } from 'yargs'
import chalk from 'chalk'
import { GameAutomationError } from '../../utils/errors.js'

export const editCommand: CommandModule = {
  command: 'edit <name>',
  describe: 'Edit an existing script',
  builder: yargs =>
    yargs
      .positional('name', {
        describe: 'Name of the script to edit',
        type: 'string',
        demandOption: true,
      })
      .option('editor', {
        alias: 'e',
        describe: 'Editor to use (code, vim, nano, etc.)',
        type: 'string',
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.blue(`✏️  Opening script for editing: ${argv.name}`))

      if (argv.editor) {
        console.log(chalk.gray(`Editor: ${argv.editor}`))
      }
      else {
        console.log(chalk.gray('Editor: Using system default'))
      }

      // TODO: 集成 @freedom/core 的脚本编辑功能
      // const scriptService = new ScriptService()
      // const scriptExists = await scriptService.scriptExists(argv.name)
      //
      // if (!scriptExists) {
      //   throw new GameAutomationError(`Script "${argv.name}" not found`)
      // }
      //
      // const scriptPath = await scriptService.getScriptPath(argv.name)
      // await openInEditor(scriptPath, argv.editor)

      console.log(chalk.yellow('⚠️  Script editing not yet implemented'))
      console.log(chalk.cyan('💡 Use "freedom script list" to see available scripts'))
    }
    catch (error) {
      if (error instanceof Error) {
        throw new GameAutomationError(`Script editing failed: ${error.message}`)
      }
      throw new GameAutomationError('Script editing failed: Unknown error')
    }
  },
}
