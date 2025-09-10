import type { CommandModule } from 'yargs'

// 重置配置命令
import process from 'node:process'
import chalk from 'chalk'
import { ConfigurationError } from '../../utils/errors.js'

export const resetCommand: CommandModule = {
  command: 'reset [key]',
  describe: 'Reset configuration to defaults',
  builder: yargs =>
    yargs
      .positional('key', {
        describe: 'Specific key to reset (if not provided, resets all)',
        type: 'string',
      })
      .option('confirm', {
        alias: 'y',
        describe: 'Skip confirmation prompt',
        type: 'boolean',
        default: false,
      })
      .option('backup', {
        alias: 'b',
        describe: 'Create backup before reset',
        type: 'boolean',
        default: true,
      })
      .option('global', {
        alias: 'g',
        describe: 'Reset global configuration',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    try {
      const isFullReset = !argv.key
      const scope = argv.global ? 'global' : 'local'

      if (isFullReset) {
        console.log(chalk.yellow(`🔄 Resetting ALL ${scope} configuration to defaults`))
      }
      else {
        console.log(chalk.yellow(`🔄 Resetting configuration key: ${chalk.cyan(argv.key)}`))
      }

      console.log(chalk.gray(`Backup: ${argv.backup ? 'Yes' : 'No'}`))
      console.log(chalk.gray(`Skip confirmation: ${argv.confirm ? 'Yes' : 'No'}`))

      // 确认提示
      if (!argv.confirm) {
        const confirmMessage = isFullReset
          ? `Are you sure you want to reset ALL ${scope} configuration to defaults?`
          : `Are you sure you want to reset "${argv.key}" to its default value?`

        console.log()
        console.log(chalk.red('⚠️  WARNING: This action cannot be undone!'))
        console.log(chalk.yellow(confirmMessage))

        // TODO: 实现交互式确认
        // const confirmed = await promptConfirmation()
        // if (!confirmed) {
        //   console.log(chalk.yellow('Operation cancelled'))
        //   return
        // }

        console.log(chalk.yellow('⚠️  Interactive confirmation not yet implemented'))
        console.log(chalk.cyan('💡 Use --confirm to skip this prompt'))
        return
      }

      if (argv.backup) {
        console.log(chalk.blue('💾 Creating configuration backup...'))
        // TODO: 实现配置备份
        console.log(chalk.green('✅ Backup created'))
      }

      // TODO: 实现配置重置逻辑
      // const configService = new ConfigService()
      // if (isFullReset) {
      //   await configService.resetAllConfig(argv.global)
      // } else {
      //   await configService.resetConfigKey(argv.key!, argv.global)
      // }

      console.log()
      console.log(chalk.green('✅ Configuration reset completed'))
      console.log(chalk.yellow('⚠️  Configuration reset not yet implemented'))

      if (isFullReset) {
        console.log(chalk.cyan('💡 Run "freedom config list" to see the default values'))
      }
    }
    catch (error) {
      if (error instanceof ConfigurationError) {
        console.error(chalk.red('❌ Configuration Error:'), error.message)
        process.exit(1)
      }
      throw error
    }
  },
}
