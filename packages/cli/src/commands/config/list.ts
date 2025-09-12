import type { CommandModule } from 'yargs'

// 列出配置命令
import process from 'node:process'
import { getAllConfigValues } from '@freedom/shared/config'
import chalk from 'chalk'

export const listCommand: CommandModule = {
  command: 'list',
  describe: 'List all configuration settings',
  builder: yargs =>
    yargs
      .option('filter', {
        alias: 'f',
        describe: 'Filter keys by pattern (supports glob patterns)',
        type: 'string',
      })
      .option('format', {
        describe: 'Output format',
        type: 'string',
        choices: ['table', 'json', 'yaml', 'plain'],
        default: 'table',
      })
      .option('show-defaults', {
        describe: 'Show default values',
        type: 'boolean',
        default: false,
      })
      .option('show-sources', {
        describe: 'Show configuration sources',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.blue('📋 Configuration Settings:'))

      if (argv.filter) {
        console.log(chalk.gray(`Filter: ${argv.filter}`))
      }

      console.log(chalk.gray(`Format: ${argv.format}`))
      console.log()

      const config = getAllConfigValues()

      if (argv.format === 'json') {
        console.log(JSON.stringify(config, null, 2))
        return
      }

      if (argv.format === 'yaml') {
        // 简单的 YAML 输出
        Object.entries(config).forEach(([key, value]) => {
          console.log(`${key}: ${JSON.stringify(value)}`)
        })
        return
      }

      // 表格或纯文本格式
      const filteredConfig = argv.filter
        ? Object.entries(config).filter(([key]) =>
            key.toLowerCase().includes((argv.filter as string).toLowerCase()),
          )
        : Object.entries(config)

      if (filteredConfig.length === 0) {
        console.log(chalk.yellow('No configuration settings found'))
        return
      }

      filteredConfig.forEach(([key, value]) => {
        const displayValue = typeof value === 'string' ? value : JSON.stringify(value)

        if (argv.format === 'table') {
          console.log(`${chalk.cyan(key.padEnd(25))} ${chalk.white('│')} ${chalk.green(displayValue)}`)
        }
        else {
          console.log(`${key}: ${displayValue}`)
        }

        if (argv['show-sources']) {
          console.log(chalk.gray(`  Source: user configuration`))
        }
      })

      console.log()
      console.log(chalk.gray(`Found ${filteredConfig.length} configuration setting(s)`))

      if (argv['show-defaults']) {
        console.log(chalk.cyan('💡 Use "freedom config get <key>" to see individual values'))
      }
    }
    catch (error) {
      console.error(chalk.red('❌ Failed to list configuration:'), error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  },
}
