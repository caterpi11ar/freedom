import chalk from 'chalk'
import { Command } from 'commander'
import inquirer from 'inquirer'

export const taskCommand = new Command('task')
  .description('📋 管理任务')

taskCommand
  .command('list')
  .description('列出所有任务')
  .option('-s, --status <status>', '按状态筛选 (pending|running|completed|failed)')
  .action((options) => {
    console.log(chalk.cyan('📋 任务列表'))

    // TODO: 实际的任务数据
    const tasks = [
      { id: '001', name: 'daily-tasks', status: 'completed', time: '2024-01-15 10:30' },
      { id: '002', name: 'login', status: 'running', time: '2024-01-15 11:00' },
      { id: '003', name: 'explore', status: 'pending', time: '2024-01-15 11:30' },
    ]

    const filteredTasks = options.status
      ? tasks.filter(t => t.status === options.status)
      : tasks

    if (filteredTasks.length === 0) {
      console.log(chalk.gray('暂无任务'))
      return
    }

    filteredTasks.forEach((task) => {
      const statusColor = task.status === 'completed'
        ? chalk.green
        : task.status === 'running'
          ? chalk.blue
          : task.status === 'failed'
            ? chalk.red
            : chalk.yellow

      console.log(`${statusColor('●')} ${task.id} - ${task.name} (${statusColor(task.status)}) - ${chalk.gray(task.time)}`)
    })
  })

taskCommand
  .command('create')
  .description('创建新任务')
  .action(async () => {
    try {
      const answers = await inquirer.prompt([
        {
          type: 'list',
          name: 'scriptType',
          message: '选择任务类型:',
          choices: [
            { name: '每日任务 (daily-tasks)', value: 'daily-tasks' },
            { name: '自动登录 (login)', value: 'login' },
            { name: '自动探索 (explore)', value: 'explore' },
            { name: '副本刷取 (domain)', value: 'domain' },
          ],
        },
        {
          type: 'input',
          name: 'name',
          message: '任务名称:',
          default: answers => answers.scriptType,
        },
        {
          type: 'confirm',
          name: 'confirm',
          message: '确认创建任务?',
          default: true,
        },
      ])

      if (answers.confirm) {
        console.log(chalk.green(`✅ 任务 "${answers.name}" 创建成功！`))
        console.log(chalk.gray(`类型: ${answers.scriptType}`))
      }
      else {
        console.log(chalk.yellow('❌ 任务创建已取消'))
      }
    }
    catch (error) {
      console.error(chalk.red('❌ 创建任务失败', error))
    }
  })

taskCommand
  .command('cancel <task-id>')
  .description('取消指定任务')
  .action((taskId) => {
    console.log(chalk.yellow(`⏹️ 正在取消任务: ${taskId}`))
    // TODO: 实际的任务取消逻辑
    console.log(chalk.green(`✅ 任务 ${taskId} 已取消`))
  })
