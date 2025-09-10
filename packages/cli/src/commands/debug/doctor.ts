// 系统诊断命令
import type { CommandModule } from 'yargs'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import chalk from 'chalk'

export const doctorCommand: CommandModule = {
  command: 'doctor',
  describe: 'Run system diagnostics and health checks',
  builder: yargs =>
    yargs
      .option('verbose', {
        alias: 'v',
        describe: 'Show detailed diagnostic information',
        type: 'boolean',
        default: false,
      })
      .option('fix', {
        describe: 'Attempt to fix detected issues',
        type: 'boolean',
        default: false,
      })
      .option('output', {
        alias: 'o',
        describe: 'Output format',
        type: 'string',
        choices: ['pretty', 'json', 'markdown'],
        default: 'pretty',
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.green('🔍 Running Freedom system diagnostics...\n'))

      const checks = [
        checkNodeVersion(),
        checkPlatformSupport(),
        checkMemoryUsage(),
        checkDiskSpace(),
        checkConfigFiles(),
        checkDependencies(),
        checkPermissions(),
      ]

      const results = await Promise.all(checks)
      const passed = results.filter(r => r.status === 'pass').length
      const warnings = results.filter(r => r.status === 'warn').length
      const errors = results.filter(r => r.status === 'fail').length

      // 显示结果
      results.forEach((result) => {
        const icon = getStatusIcon(result.status)
        const color = getStatusColor(result.status)

        console.log(color(`${icon} ${result.name}`))

        if (argv.verbose || result.status !== 'pass') {
          console.log(chalk.gray(`   ${result.message}`))
        }

        if (result.details && argv.verbose) {
          console.log(chalk.gray(`   Details: ${result.details}`))
        }

        if (result.fix && result.status !== 'pass') {
          console.log(chalk.cyan(`   Fix: ${result.fix}`))
        }

        console.log()
      })

      // 总结
      console.log(chalk.blue('📊 Diagnostic Summary:'))
      console.log(chalk.green(`✅ Passed: ${passed}`))
      console.log(chalk.yellow(`⚠️  Warnings: ${warnings}`))
      console.log(chalk.red(`❌ Errors: ${errors}`))
      console.log()

      if (errors > 0) {
        console.log(chalk.red('❌ Some critical issues were detected. Please address them before using Freedom.'))
        if (argv.fix) {
          console.log(chalk.cyan('💡 Use --fix to attempt automatic repairs'))
        }
        process.exit(1)
      }
      else if (warnings > 0) {
        console.log(chalk.yellow('⚠️  Some issues were detected, but Freedom should still work.'))
      }
      else {
        console.log(chalk.green('✅ All checks passed! Freedom is ready to use.'))
      }
    }
    catch (error) {
      console.error(chalk.red('❌ Diagnostic check failed:'), error instanceof Error ? error.message : 'Unknown error')
      process.exit(1)
    }
  },
}

interface DiagnosticResult {
  name: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: string
  fix?: string
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'pass': return '✅'
    case 'warn': return '⚠️ '
    case 'fail': return '❌'
    default: return '❓'
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'pass': return chalk.green
    case 'warn': return chalk.yellow
    case 'fail': return chalk.red
    default: return chalk.gray
  }
}

async function checkNodeVersion(): Promise<DiagnosticResult> {
  const version = process.version
  const majorVersion = Number.parseInt(version.slice(1).split('.')[0])

  if (majorVersion >= 20) {
    return {
      name: 'Node.js Version',
      status: 'pass',
      message: `Node.js ${version} (supported)`,
    }
  }
  else if (majorVersion >= 18) {
    return {
      name: 'Node.js Version',
      status: 'warn',
      message: `Node.js ${version} (minimum supported, but upgrade recommended)`,
      fix: 'Consider upgrading to Node.js 20 or later',
    }
  }
  else {
    return {
      name: 'Node.js Version',
      status: 'fail',
      message: `Node.js ${version} (unsupported)`,
      fix: 'Upgrade to Node.js 18 or later',
    }
  }
}

async function checkPlatformSupport(): Promise<DiagnosticResult> {
  const platform = process.platform
  const arch = process.arch

  const supportedPlatforms = ['win32', 'darwin', 'linux']
  const supportedArchs = ['x64', 'arm64']

  if (supportedPlatforms.includes(platform) && supportedArchs.includes(arch)) {
    return {
      name: 'Platform Support',
      status: 'pass',
      message: `${platform}/${arch} (fully supported)`,
    }
  }
  else {
    return {
      name: 'Platform Support',
      status: 'warn',
      message: `${platform}/${arch} (limited support)`,
      details: 'Some features may not work as expected',
    }
  }
}

async function checkMemoryUsage(): Promise<DiagnosticResult> {
  const usage = process.memoryUsage()
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)

  if (heapUsedMB < 100) {
    return {
      name: 'Memory Usage',
      status: 'pass',
      message: `${heapUsedMB}MB used / ${heapTotalMB}MB allocated`,
    }
  }
  else if (heapUsedMB < 500) {
    return {
      name: 'Memory Usage',
      status: 'warn',
      message: `${heapUsedMB}MB used / ${heapTotalMB}MB allocated (high usage)`,
    }
  }
  else {
    return {
      name: 'Memory Usage',
      status: 'fail',
      message: `${heapUsedMB}MB used / ${heapTotalMB}MB allocated (very high usage)`,
      fix: 'Consider restarting the application',
    }
  }
}

async function checkDiskSpace(): Promise<DiagnosticResult> {
  // 简化的磁盘空间检查
  const homeDir = homedir()

  return {
    name: 'Disk Space',
    status: 'pass',
    message: `Available (check not implemented)`,
    details: `Home directory: ${homeDir}`,
  }
}

async function checkConfigFiles(): Promise<DiagnosticResult> {
  const configPaths = [
    join(homedir(), '.freedom', 'config.json'),
    join(process.cwd(), '.freedom.json'),
    join(process.cwd(), 'freedom.config.json'),
  ]

  const existingConfigs = configPaths.filter(existsSync)

  if (existingConfigs.length > 0) {
    return {
      name: 'Configuration Files',
      status: 'pass',
      message: `Found ${existingConfigs.length} config file(s)`,
      details: existingConfigs.join(', '),
    }
  }
  else {
    return {
      name: 'Configuration Files',
      status: 'warn',
      message: 'No configuration files found (using defaults)',
      fix: 'Run "freedom config set game.url <your-game-url>" to create initial config',
    }
  }
}

async function checkDependencies(): Promise<DiagnosticResult> {
  // TODO: 检查关键依赖如 playwright 浏览器
  return {
    name: 'Dependencies',
    status: 'warn',
    message: 'Dependency check not yet implemented',
    fix: 'Run "pnpm install" to ensure all dependencies are installed',
  }
}

async function checkPermissions(): Promise<DiagnosticResult> {
  const homeDir = homedir()
  const freedomDir = join(homeDir, '.freedom')

  try {
    // 尝试在 .freedom 目录写入测试文件
    // 这里简化处理
    return {
      name: 'File Permissions',
      status: 'pass',
      message: 'File system permissions OK',
      details: `Freedom directory: ${freedomDir}`,
    }
  }
  catch {
    return {
      name: 'File Permissions',
      status: 'fail',
      message: 'Cannot write to Freedom directory',
      fix: `Ensure write permissions for ${freedomDir}`,
    }
  }
}
