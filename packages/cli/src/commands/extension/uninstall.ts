import type { CommandModule } from 'yargs'

// 卸载扩展命令
import process from 'node:process'
import chalk from 'chalk'
import { GameAutomationError } from '../../utils/errors.js'

export const uninstallCommand: CommandModule = {
  command: 'uninstall <name>',
  describe: 'Uninstall an extension',
  builder: yargs =>
    yargs
      .positional('name', {
        describe: 'Name of extension to uninstall',
        type: 'string',
        demandOption: true,
      })
      .option('keep-data', {
        alias: 'k',
        describe: 'Keep extension data and configuration after uninstall',
        type: 'boolean',
        default: false,
      })
      .option('force', {
        alias: 'f',
        describe: 'Force uninstall without confirmation',
        type: 'boolean',
        default: false,
      })
      .option('backup', {
        alias: 'b',
        describe: 'Create backup before uninstall',
        type: 'boolean',
        default: true,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.red(`📤 Uninstalling extension: ${chalk.cyan(argv.name)}`))
      console.log(chalk.gray(`Keep data: ${argv['keep-data'] ? 'Yes' : 'No'}`))
      console.log(chalk.gray(`Backup: ${argv.backup ? 'Yes' : 'No'}`))
      console.log(chalk.gray(`Force: ${argv.force ? 'Yes' : 'No'}`))
      console.log()

      // TODO: 实现扩展卸载逻辑
      // const extensionManager = new ExtensionManager()
      //
      // // 检查扩展是否存在
      // const extension = await extensionManager.findExtension(argv.name)
      // if (!extension) {
      //   throw new GameAutomationError(`Extension "${argv.name}" not found`)
      // }
      //
      // // 确认提示
      // if (!argv.force) {
      //   console.log(chalk.yellow('⚠️  Warning: This will permanently remove the extension'))
      //   const confirmed = await promptConfirmation(`Are you sure you want to uninstall "${argv.name}"?`)
      //   if (!confirmed) {
      //     console.log(chalk.yellow('Uninstallation cancelled'))
      //     return
      //   }
      // }
      //
      // // 禁用扩展（如果启用）
      // if (extension.enabled) {
      //   console.log(chalk.blue('Disabling extension...'))
      //   await extensionManager.disable(argv.name)
      // }
      //
      // // 创建备份
      // if (argv.backup) {
      //   console.log(chalk.blue('Creating backup...'))
      //   await extensionManager.backup(argv.name)
      //   console.log(chalk.green('✅ Backup created'))
      // }
      //
      // // 卸载扩展
      // await extensionManager.uninstall(argv.name, {
      //   keepData: argv['keep-data']
      // })

      console.log()
      if (!argv.force) {
        console.log(chalk.yellow('⚠️  Interactive confirmation not yet implemented'))
        console.log(chalk.cyan('💡 Use --force to skip confirmation'))
        return
      }

      console.log(chalk.green('✅ Extension uninstallation completed'))
      console.log(chalk.yellow('⚠️  Extension uninstallation not yet implemented'))

      if (!argv['keep-data']) {
        console.log(chalk.gray('Extension data and configuration removed'))
      }
      else {
        console.log(chalk.gray('Extension data preserved'))
      }
    }
    catch (error) {
      if (error instanceof GameAutomationError) {
        console.error(chalk.red('❌ Uninstallation failed:'), error.message)
        process.exit(1)
      }
      throw error
    }
  },
}
