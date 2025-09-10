import type { CommandModule } from 'yargs'

// 设置配置值命令
import process from 'node:process'
import chalk from 'chalk'
import { ConfigurationError } from '../../utils/errors.js'

export const setCommand: CommandModule = {
  command: 'set <key> <value>',
  describe: 'Set a configuration value',
  builder: yargs =>
    yargs
      .positional('key', {
        describe: 'Configuration key to set (e.g., game.url, automation.headless)',
        type: 'string',
        demandOption: true,
      })
      .positional('value', {
        describe: 'Value to set',
        type: 'string',
        demandOption: true,
      })
      .option('type', {
        alias: 't',
        describe: 'Value type',
        type: 'string',
        choices: ['string', 'number', 'boolean', 'json'],
        default: 'string',
      })
      .option('global', {
        alias: 'g',
        describe: 'Set as global configuration',
        type: 'boolean',
        default: false,
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.green(`⚙️  Setting configuration: ${chalk.cyan(argv.key)}`))

      const valueStr = argv.value as string
      let parsedValue: any = valueStr

      // 根据类型转换值
      switch (argv.type) {
        case 'number':
          parsedValue = Number(valueStr)
          if (Number.isNaN(parsedValue)) {
            throw new ConfigurationError(`Invalid number value: ${valueStr}`)
          }
          break
        case 'boolean':
          if (valueStr.toLowerCase() === 'true') {
            parsedValue = true
          }
          else if (valueStr.toLowerCase() === 'false') {
            parsedValue = false
          }
          else {
            throw new ConfigurationError(`Invalid boolean value: ${valueStr}. Use 'true' or 'false'`)
          }
          break
        case 'json':
          try {
            parsedValue = JSON.parse(valueStr)
          }
          catch {
            throw new ConfigurationError(`Invalid JSON value: ${valueStr}`)
          }
          break
      }

      console.log(chalk.gray(`Value: ${JSON.stringify(parsedValue)}`))
      console.log(chalk.gray(`Type: ${argv.type}`))
      console.log(chalk.gray(`Scope: ${argv.global ? 'Global' : 'Local'}`))

      // TODO: 实现配置设置逻辑
      // const configService = new ConfigService()
      // await configService.setConfig(argv.key, parsedValue, argv.global)

      console.log()
      console.log(chalk.green('✅ Configuration updated successfully'))
      console.log(chalk.yellow('⚠️  Configuration persistence not yet implemented'))
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
