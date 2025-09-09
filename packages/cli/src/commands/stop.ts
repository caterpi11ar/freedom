import process from 'node:process'
import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'

export const stopCommand = new Command('stop')
  .description('⏹️ 停止服务')
  .option('-f, --force', '强制停止')
  .action(async (options) => {
    try {
      const spinner = ora('正在停止 Freedom 服务...').start()

      // TODO: 实际的服务停止逻辑
      await new Promise(resolve => setTimeout(resolve, 1200))

      if (options.force) {
        spinner.succeed(chalk.green('✅ Freedom 服务已强制停止'))
      }
      else {
        spinner.succeed(chalk.green('✅ Freedom 服务已安全停止'))
      }

      console.log(chalk.gray('所有运行中的任务已暂停'))
    }
    catch (error) {
      console.error(chalk.red('❌ 停止服务失败'))
      if (error instanceof Error) {
        console.error(chalk.red(`错误信息: ${error.message}`))
      }
      process.exit(1)
    }
  })
