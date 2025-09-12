// 主程序入口 - 纯交互式模式
import process from 'node:process'
import chalk from 'chalk'
import { InteractiveTerminal } from './interactive/terminal.js'

function displayLogo(): void {
  // 创建渐变色的 FREEDOM logo - 科技感蓝紫青渐变
  const logoLines = [
    ' ███████╗██████╗ ███████╗███████╗██████╗  ██████╗ ███╗   ███╗',
    ' ██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗██╔═══██╗████╗ ████║',
    ' █████╗  ██████╔╝█████╗  █████╗  ██║  ██║██║   ██║██╔████╔██║',
    ' ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██║  ██║██║   ██║██║╚██╔╝██║',
    ' ██║     ██║  ██║███████╗███████╗██████╔╝╚██████╔╝██║ ╚═╝ ██║',
    ' ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚═════╝  ╚═════╝ ╚═╝     ╚═╝',
  ]

  // 更精细的字符级渐变色配置
  function createGradientLine(line: string, startColor: [number, number, number], endColor: [number, number, number]): string {
    const chars = line.split('')
    const gradientLine = chars.map((char, index) => {
      if (char === ' ')
        return char

      const progress = index / (chars.length - 1)
      const r = Math.round(startColor[0] + (endColor[0] - startColor[0]) * progress)
      const g = Math.round(startColor[1] + (endColor[1] - startColor[1]) * progress)
      const b = Math.round(startColor[2] + (endColor[2] - startColor[2]) * progress)

      return chalk.rgb(r, g, b).bold(char)
    }).join('')

    return gradientLine
  }

  const logoLineWidth = logoLines[0].length

  // 科技感装饰边框
  console.log()
  console.log(chalk.rgb(0, 200, 255)(`┌${'─'.repeat(logoLineWidth)}┐`))

  // 每行使用不同的渐变色
  const colorPairs = [
    [[0, 150, 255], [100, 200, 255]], // 蓝色渐变
    [[50, 180, 255], [150, 150, 255]], // 蓝紫渐变
    [[100, 200, 255], [200, 100, 255]], // 蓝紫渐变
    [[150, 150, 255], [255, 100, 200]], // 紫粉渐变
    [[200, 100, 255], [100, 255, 200]], // 紫青渐变
    [[100, 255, 200], [0, 255, 255]], // 青色渐变
  ]

  logoLines.forEach((line, index) => {
    const [startColor, endColor] = colorPairs[index] as [[number, number, number], [number, number, number]]
    const gradientLine = createGradientLine(line, startColor, endColor)
    console.log(chalk.rgb(0, 200, 255)('│') + gradientLine + chalk.rgb(0, 200, 255)('│'))
  })

  console.log(chalk.rgb(0, 200, 255)(`└${'─'.repeat(logoLineWidth)}┘`))

  // 科技感标题和版本信息
  console.log()
  const title = 'Freedom - Interactive Terminal Mode'
  const titleGradient = createGradientLine(title, [0, 255, 255], [255, 100, 255])
  console.log(`  ${titleGradient}`)

  console.log(`  ${chalk.rgb(100, 100, 150)(`Version: ${process.env.CLI_VERSION || '0.1.0'} `)}${chalk.rgb(0, 255, 200)('• ')}${chalk.rgb(80, 80, 120)('Interactive commands ready')}`)
  console.log()
}

// 启动参数接口
interface StartupOptions {
  debug?: boolean
  config?: string
  headless?: boolean
  help?: boolean
  version?: boolean
}

// 解析启动参数
function parseStartupArgs(args: string[]): StartupOptions {
  const options: StartupOptions = {}

  for (const arg of args) {
    if (arg === '--debug') {
      options.debug = true
    }
    else if (arg === '--headless') {
      options.headless = true
    }
    else if (arg === '--help' || arg === '-h') {
      options.help = true
    }
    else if (arg === '--version' || arg === '-v') {
      options.version = true
    }
  }

  return options
}

// 显示帮助信息
function showHelp(): void {
  console.log(chalk.cyan.bold('\n🎮 Freedom - Genshin Impact Automation Tool\n'))
  console.log(chalk.white('Usage: freedom [options]\n'))
  console.log(chalk.yellow('Startup Options:'))
  console.log(chalk.white('  --debug          Enable debug mode'))
  console.log(chalk.white('  --headless       Run in headless mode'))
  console.log(chalk.white('  --help, -h       Show this help'))
  console.log(chalk.white('  --version, -v    Show version\n'))
  console.log(chalk.gray('Note: All game operations are performed through interactive commands after startup.\n'))
}

// 显示版本信息
function showVersion(): void {
  const version = process.env.CLI_VERSION || '0.1.0'
  console.log(chalk.cyan(`Freedom v${version}`))
}

export async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const options = parseStartupArgs(args)

  // 处理帮助和版本参数
  if (options.help) {
    showHelp()
    return
  }

  if (options.version) {
    showVersion()
    return
  }

  // 显示 Logo
  displayLogo()

  // 启动交互式终端
  const terminal = new InteractiveTerminal(options)
  await terminal.start()
}
