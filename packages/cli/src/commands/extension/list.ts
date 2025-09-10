import type { CommandModule } from 'yargs'

// 列出扩展命令
import process from 'node:process'
import chalk from 'chalk'

export const listCommand: CommandModule = {
  command: 'list',
  describe: 'List installed extensions',
  builder: yargs =>
    yargs
      .option('enabled-only', {
        describe: 'Show only enabled extensions',
        type: 'boolean',
        default: false,
      })
      .option('format', {
        alias: 'f',
        describe: 'Output format',
        type: 'string',
        choices: ['table', 'json', 'plain'],
        default: 'table',
      })
      .option('show-disabled', {
        describe: 'Include disabled extensions',
        type: 'boolean',
        default: true,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.blue('📦 Freedom Extensions:'))

      if (argv['enabled-only']) {
        console.log(chalk.gray('Filter: Enabled extensions only'))
      }

      console.log(chalk.gray(`Format: ${argv.format}`))
      console.log()

      // TODO: 集成扩展管理系统
      // const extensionManager = new ExtensionManager()
      // const extensions = await extensionManager.listExtensions({
      //   enabledOnly: argv['enabled-only'],
      //   includeDisabled: argv['show-disabled']
      // })

      // 模拟扩展数据
      const mockExtensions = [
        {
          name: 'genshin-auto-daily',
          version: '1.2.0',
          enabled: true,
          description: 'Automated daily commissions',
          author: 'freedom-community',
        },
        {
          name: 'resin-optimizer',
          version: '0.8.1',
          enabled: false,
          description: 'Optimize resin usage',
          author: 'user123',
        },
      ]

      if (mockExtensions.length === 0) {
        console.log(chalk.yellow('No extensions installed'))
        console.log(chalk.cyan('💡 Use "freedom extension install <name>" to install extensions'))
        return
      }

      if (argv.format === 'json') {
        console.log(JSON.stringify(mockExtensions, null, 2))
        return
      }

      mockExtensions.forEach((ext) => {
        const status = ext.enabled ? chalk.green('✅ Enabled') : chalk.gray('❌ Disabled')

        if (argv.format === 'table') {
          console.log(`${chalk.cyan(ext.name.padEnd(20))} ${chalk.white('│')} ${ext.version.padEnd(8)} ${chalk.white('│')} ${status}`)
          if (ext.description) {
            console.log(`${' '.repeat(20)} ${chalk.white('│')} ${chalk.gray(ext.description)}`)
          }
        }
        else {
          console.log(`${chalk.cyan(ext.name)} (${ext.version}) - ${status}`)
          if (ext.description) {
            console.log(`  ${chalk.gray(ext.description)}`)
          }
        }

        console.log()
      })

      console.log(chalk.gray(`Found ${mockExtensions.length} extension(s)`))
      console.log(chalk.yellow('⚠️  Extension system not yet fully implemented'))
    }
    catch (error) {
      console.error(chalk.red('❌ Failed to list extensions:'), error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  },
}
