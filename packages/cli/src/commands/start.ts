import process from 'node:process'
import chalk from 'chalk'
import { Command } from 'commander'
import ora from 'ora'
import { getConfig } from '../config/manager'
import { logger } from '../utils/logger'

export const startCommand = new Command('start')
  .description('🚀 启动自动化脚本')
  .argument('[script-name]', '要执行的脚本名称')
  .option('-h, --headless', '无头模式运行浏览器', true)
  .option('--no-headless', '显示浏览器界面')
  .option('-t, --timeout <number>', '脚本超时时间(秒)', '3600')
  .option('-r, --retry <number>', '重试次数', '3')
  .option('--debug', '启用调试模式')
  .action(async (scriptName, options) => {
    try {
      await getConfig()

      // 如果没有指定脚本，显示可用脚本列表
      if (!scriptName) {
        console.log(chalk.yellow('📋 可用脚本:'))

        const availableScripts = [
          'daily-tasks - 每日任务自动完成',
          'login - 自动登录游戏',
          'explore - 自动探索',
          'domain - 副本自动刷取',
        ]

        availableScripts.forEach((script, index) => {
          console.log(chalk.cyan(`  ${index + 1}. ${script}`))
        })

        console.log(chalk.gray('\n💡 使用方法: /start <script-name>'))
        return
      }

      const spinner = ora(`正在启动脚本: ${scriptName}`).start()

      // TODO: 实际的脚本执行逻辑
      await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟执行时间

      spinner.succeed(chalk.green(`✅ 脚本 ${scriptName} 启动成功！`))

      console.log(chalk.blue('📊 执行配置:'))
      console.log(chalk.gray(`  脚本名称: ${scriptName}`))
      console.log(chalk.gray(`  执行模式: ${options.headless ? '无头模式' : '可视模式'}`))
      console.log(chalk.gray(`  超时时间: ${options.timeout}秒`))
      console.log(chalk.gray(`  重试次数: ${options.retry}次`))
    }
    catch (error) {
      console.error(chalk.red('❌ 脚本启动失败'))
      logger.error('Start command failed:', error)

      if (error instanceof Error) {
        console.error(chalk.red(`错误信息: ${error.message}`))
      }

      console.log(chalk.yellow('\n💡 尝试运行 "/doctor" 检查系统状态'))
      process.exit(1)
    }
  })
