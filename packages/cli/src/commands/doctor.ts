import process from 'node:process'
import chalk from 'chalk'
import { Command } from 'commander'

export const doctorCommand = new Command('doctor')
  .description('🔍 系统诊断和配置检查')
  .action(async () => {
    console.log(chalk.cyan('🔍 Freedom 系统诊断'))
    console.log(chalk.green(`✅ Node.js 版本: ${process.version}`))
    console.log(chalk.green(`✅ 平台: ${process.platform}`))
    console.log(chalk.green('✅ CLI 运行正常'))
  })
