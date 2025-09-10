// 性能监控命令
import type { CommandModule } from 'yargs'
import process from 'node:process'
import chalk from 'chalk'

export const monitorCommand: CommandModule = {
  command: 'monitor',
  describe: 'Monitor system performance and resource usage',
  builder: yargs =>
    yargs
      .option('watch', {
        alias: 'w',
        describe: 'Continuously monitor (like watch command)',
        type: 'boolean',
        default: false,
      })
      .option('interval', {
        alias: 'i',
        describe: 'Monitoring interval in seconds',
        type: 'number',
        default: 5,
      })
      .option('duration', {
        alias: 'd',
        describe: 'Duration to monitor in seconds (0 = unlimited)',
        type: 'number',
        default: 0,
      })
      .option('output', {
        alias: 'o',
        describe: 'Output file for metrics data',
        type: 'string',
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.blue('📊 Freedom Performance Monitor'))
      console.log(chalk.gray(`Interval: ${argv.interval}s`))
      console.log(chalk.gray(`Watch mode: ${argv.watch ? 'Yes' : 'No'}`))

      if ((argv.duration as number) > 0) {
        console.log(chalk.gray(`Duration: ${argv.duration}s`))
      }

      if (argv.output) {
        console.log(chalk.gray(`Output file: ${argv.output}`))
      }

      console.log(chalk.gray('Press Ctrl+C to stop monitoring\n'))

      let iterations = 0
      const duration = argv.duration as number
      const interval = argv.interval as number
      const maxIterations = duration > 0 ? Math.ceil(duration / interval) : 0

      const monitorLoop = () => {
        console.clear()
        console.log(chalk.blue('📊 Freedom Performance Monitor'))
        console.log(chalk.gray(`${new Date().toLocaleString()}\n`))

        displaySystemMetrics()
        console.log()
        displayProcessMetrics()
        console.log()
        displayGameSessionMetrics()

        iterations++

        if (maxIterations > 0 && iterations >= maxIterations) {
          console.log(chalk.green('\n✅ Monitoring completed'))
          return
        }

        if (argv.watch) {
          setTimeout(monitorLoop, interval * 1000)
        }
      }

      // 开始监控
      monitorLoop()

      if (!argv.watch) {
        console.log(chalk.cyan('\n💡 Use --watch to continuously monitor'))
      }
    }
    catch (error) {
      console.error(chalk.red('❌ Monitoring failed:'), error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  },
}

function displaySystemMetrics(): void {
  console.log(chalk.cyan('💻 System Metrics:'))

  const cpuUsage = process.cpuUsage()
  console.log(`CPU Usage: ${formatCpuUsage(cpuUsage)}`)

  const memUsage = process.memoryUsage()
  console.log(`Memory: ${formatMemoryUsage(memUsage)}`)

  console.log(`Platform: ${process.platform} (${process.arch})`)
  console.log(`Node.js: ${process.version}`)
  console.log(`Uptime: ${formatUptime(process.uptime())}`)
}

function displayProcessMetrics(): void {
  console.log(chalk.cyan('🔧 Process Metrics:'))

  console.log(`PID: ${process.pid}`)
  console.log(`Working Directory: ${process.cwd()}`)
  console.log(`Arguments: ${process.argv.slice(2).join(' ')}`)

  // TODO: 添加更多进程指标
  console.log(chalk.yellow('Extended process metrics not yet implemented'))
}

function displayGameSessionMetrics(): void {
  console.log(chalk.cyan('🎮 Game Session Metrics:'))

  // TODO: 集成游戏会话监控
  console.log(chalk.yellow('Game session monitoring not yet implemented'))
  console.log(chalk.gray('Will show: Active sessions, Browser instances, Script executions, Error rates'))
}

function formatCpuUsage(usage: NodeJS.CpuUsage): string {
  const userMs = usage.user / 1000
  const systemMs = usage.system / 1000
  const totalMs = userMs + systemMs
  return `${totalMs.toFixed(2)}ms (user: ${userMs.toFixed(2)}ms, system: ${systemMs.toFixed(2)}ms)`
}

function formatMemoryUsage(usage: NodeJS.MemoryUsage): string {
  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(1)}MB`
  }

  return `${formatBytes(usage.heapUsed)} used / ${formatBytes(usage.heapTotal)} allocated (RSS: ${formatBytes(usage.rss)})`
}

function formatUptime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  else {
    return `${secs}s`
  }
}
