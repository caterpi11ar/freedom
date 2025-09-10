import type { CommandModule } from 'yargs'

// 启用扩展命令
import process from 'node:process'
import chalk from 'chalk'
import { GameAutomationError } from '../../utils/errors.js'

export const enableCommand: CommandModule = {
  command: 'enable <name>',
  describe: 'Enable an installed extension',
  builder: yargs =>
    yargs
      .positional('name', {
        describe: 'Name of extension to enable',
        type: 'string',
        demandOption: true,
      })
      .option('restart', {
        alias: 'r',
        describe: 'Restart Freedom after enabling (if running)',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.green(`✅ Enabling extension: ${chalk.cyan(argv.name)}`))
      console.log(chalk.gray(`Auto-restart: ${argv.restart ? 'Yes' : 'No'}`))
      console.log()

      // TODO: 实现扩展启用逻辑
      // const extensionManager = new ExtensionManager()
      //
      // // 检查扩展是否存在
      // const extension = await extensionManager.findExtension(argv.name)
      // if (!extension) {
      //   throw new GameAutomationError(`Extension "${argv.name}" not found`)
      // }
      //
      // // 检查是否已启用
      // if (extension.enabled) {
      //   console.log(chalk.yellow(`Extension "${argv.name}" is already enabled`))
      //   return
      // }
      //
      // // 验证扩展依赖
      // console.log(chalk.blue('Checking extension dependencies...'))
      // const dependencyCheck = await extensionManager.checkDependencies(argv.name)
      // if (!dependencyCheck.satisfied) {
      //   throw new GameAutomationError(`Missing dependencies: ${dependencyCheck.missing.join(', ')}`)
      // }
      //
      // // 启用扩展
      // await extensionManager.enable(argv.name)
      //
      // // 加载扩展
      // console.log(chalk.blue('Loading extension...'))
      // await extensionManager.load(argv.name)

      console.log(chalk.green('✅ Extension enabled successfully'))
      console.log(chalk.yellow('⚠️  Extension enabling not yet implemented'))

      if (argv.restart) {
        console.log(chalk.blue('🔄 Restarting Freedom...'))
        console.log(chalk.yellow('⚠️  Auto-restart not yet implemented'))
      }
      else {
        console.log(chalk.cyan('💡 Restart Freedom to fully activate the extension'))
      }

      console.log(chalk.gray('\nUse "freedom extension list" to verify the extension is enabled'))
    }
    catch (error) {
      if (error instanceof GameAutomationError) {
        console.error(chalk.red('❌ Failed to enable extension:'), error.message)
        process.exit(1)
      }
      throw error
    }
  },
}
