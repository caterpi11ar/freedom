// 获取配置值命令
import type { CommandModule } from 'yargs'
import process from 'node:process'
import { getConfigValue } from '@freedom/shared/config'
import chalk from 'chalk'
import { ConfigurationError } from '../../utils/errors.js'

export const getCommand: CommandModule = {
  command: 'get <key>',
  describe: 'Get a configuration value',
  builder: yargs =>
    yargs
      .positional('key', {
        describe: 'Configuration key to retrieve (e.g., game.url, automation.headless)',
        type: 'string',
        demandOption: true,
      })
      .option('format', {
        alias: 'f',
        describe: 'Output format',
        type: 'string',
        choices: ['value', 'json', 'yaml'],
        default: 'value',
      })
      .option('source', {
        alias: 's',
        describe: 'Show configuration source',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.blue(`🔍 Getting configuration value for: ${chalk.cyan(argv.key)}`))

      const value = getConfigValue(argv.key as any)

      if (value === undefined) {
        throw new ConfigurationError(`Configuration key "${argv.key}" not found`)
      }

      console.log()

      if (argv.format === 'json') {
        console.log(JSON.stringify({ [argv.key as string]: value }, null, 2))
      }
      else if (argv.format === 'yaml') {
        console.log(`${argv.key}: ${JSON.stringify(value)}`)
      }
      else {
        console.log(chalk.green(typeof value === 'string' ? value : JSON.stringify(value)))
      }

      if (argv.source) {
        // TODO: 实现配置源追踪
        console.log(chalk.gray('\nSource: user configuration'))
      }
    }
    catch (error) {
      if (error instanceof ConfigurationError) {
        console.error(chalk.red('❌ Configuration Error:'), error.message)
        console.log(chalk.cyan('💡 Use "freedom config list" to see available keys'))
        process.exit(1)
      }
      throw error
    }
  },
}
