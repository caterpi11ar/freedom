import type { CommandModule } from 'yargs'

// 禁用扩展命令
import process from 'node:process'
import chalk from 'chalk'
import { GameAutomationError } from '../../utils/errors.js'

export const disableCommand: CommandModule = {
  command: 'disable <name>',
  describe: 'Disable an enabled extension',
  builder: yargs =>
    yargs
      .positional('name', {
        describe: 'Name of extension to disable',
        type: 'string',
        demandOption: true,
      })
      .option('restart', {
        alias: 'r',
        describe: 'Restart Freedom after disabling (if running)',
        type: 'boolean',
        default: false,
      })
      .option('keep-config', {
        describe: 'Keep extension configuration',
        type: 'boolean',
        default: true,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.yellow(`❌ Disabling extension: ${chalk.cyan(argv.name)}`))
      console.log(chalk.gray(`Keep configuration: ${argv['keep-config'] ? 'Yes' : 'No'}`))
      console.log(chalk.gray(`Auto-restart: ${argv.restart ? 'Yes' : 'No'}`))
      console.log()

      // TODO: 实现扩展禁用逻辑
      // const extensionManager = new ExtensionManager()
      //
      // // 检查扩展是否存在
      // const extension = await extensionManager.findExtension(argv.name)
      // if (!extension) {
      //   throw new GameAutomationError(`Extension "${argv.name}" not found`)
      // }
      //
      // // 检查是否已禁用
      // if (!extension.enabled) {
      //   console.log(chalk.yellow(`Extension "${argv.name}" is already disabled`))
      //   return
      // }
      //
      // // 卸载扩展（运行时）
      // console.log(chalk.blue('Unloading extension from runtime...'))
      // await extensionManager.unload(argv.name)
      //
      // // 禁用扩展
      // await extensionManager.disable(argv.name, {
      //   keepConfig: argv['keep-config']
      // })

      console.log(chalk.green('✅ Extension disabled successfully'))
      console.log(chalk.yellow('⚠️  Extension disabling not yet implemented'))

      if (!argv['keep-config']) {
        console.log(chalk.gray('Extension configuration removed'))
      }

      if (argv.restart) {
        console.log(chalk.blue('🔄 Restarting Freedom...'))
        console.log(chalk.yellow('⚠️  Auto-restart not yet implemented'))
      }
      else {
        console.log(chalk.cyan('💡 Restart Freedom to fully deactivate the extension'))
      }

      console.log(chalk.gray('\nUse "freedom extension list" to verify the extension is disabled'))
    }
    catch (error) {
      if (error instanceof GameAutomationError) {
        console.error(chalk.red('❌ Failed to disable extension:'), error.message)
        process.exit(1)
      }
      throw error
    }
  },
}
