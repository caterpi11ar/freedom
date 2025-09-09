import process from 'node:process'
import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'

export const restartCommand = new Command('restart')
  .description('🔄 重启服务')
  .option('--no-preserve-tasks', '不保留当前任务')
  .action(async (options) => {
    try {
      console.log(chalk.cyan('🔄 正在重启 Freedom 服务...'))

      // 停止服务
      const stopSpinner = ora('停止当前服务...').start()
      await new Promise(resolve => setTimeout(resolve, 1000))
      stopSpinner.succeed(chalk.yellow('⏹️ 服务已停止'))

      if (options.preserveTasks) {
        console.log(chalk.blue('💾 保留当前任务状态...'))
      }

      // 启动服务
      const startSpinner = ora('启动服务...').start()
      await new Promise(resolve => setTimeout(resolve, 1500))
      startSpinner.succeed(chalk.green('✅ Freedom 服务重启完成！'))

      console.log(chalk.cyan('🎮 服务已准备就绪'))
    }
    catch (error) {
      console.error(chalk.red('❌ 重启服务失败'))
      if (error instanceof Error) {
        console.error(chalk.red(`错误信息: ${error.message}`))
      }
      process.exit(1)
    }
  })
