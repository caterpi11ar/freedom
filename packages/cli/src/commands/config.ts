import chalk from 'chalk'
import { Command } from 'commander'

export const configCommand = new Command('config')
  .description('⚙️ 配置管理')

configCommand
  .command('list')
  .description('列出当前配置')
  .action(() => {
    console.log(chalk.cyan('⚙️ 当前配置:'))
    console.log(chalk.gray('暂未配置'))
  })

configCommand
  .command('set')
  .description('设置配置项')
  .argument('<key>', '配置键')
  .argument('<value>', '配置值')
  .action((key, value) => {
    console.log(chalk.green(`✅ 设置 ${key} = ${value}`))
  })
