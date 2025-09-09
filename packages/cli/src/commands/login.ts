import process from 'node:process'
import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'
import ora from 'ora'

export const loginCommand = new Command('login')
  .description('🔐 登录云原神账户')
  .option('-u, --username <username>', '用户名')
  .option('-p, --password <password>', '密码（不推荐在命令行中使用）')
  .action(async (options) => {
    try {
      let { username, password } = options

      // 如果没有提供用户名，则交互式输入
      if (!username) {
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'username',
            message: '请输入用户名:',
            validate: input => input ? true : '用户名不能为空',
          },
        ])
        username = answers.username
      }

      // 如果没有提供密码，则交互式输入
      if (!password) {
        const answers = await inquirer.prompt([
          {
            type: 'password',
            name: 'password',
            message: '请输入密码:',
            mask: '*',
            validate: input => input ? true : '密码不能为空',
          },
        ])
        password = answers.password
      }

      const spinner = ora('正在登录...').start()

      // TODO: 实际的登录逻辑
      await new Promise(resolve => setTimeout(resolve, 1500))

      spinner.succeed(chalk.green('✅ 登录成功！'))
      console.log(chalk.cyan(`欢迎回来, ${username}!`))
    }
    catch (error) {
      console.error(chalk.red('❌ 登录失败'))
      if (error instanceof Error) {
        console.error(chalk.red(`错误信息: ${error.message}`))
      }
      process.exit(1)
    }
  })
