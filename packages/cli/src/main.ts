// 主程序入口 - yargs 架构
import process from 'node:process'
import chalk from 'chalk'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { configCommand } from './commands/config.js'
import { debugCommand } from './commands/debug.js'
import { extensionCommand } from './commands/extension.js'
import { gameCommand } from './commands/game.js'
import { scriptCommand } from './commands/script.js'

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

  // 科技感装饰边框
  console.log()
  console.log(chalk.rgb(0, 200, 255)(`┌${'─'.repeat(60)}┐`))

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
    console.log(chalk.rgb(0, 200, 255)('│') + gradientLine + chalk.rgb(0, 200, 255)(' │'))
  })

  console.log(chalk.rgb(0, 200, 255)(`└${'─'.repeat(60)}┘`))

  // 科技感标题和版本信息
  console.log()
  const title = '🎮 Freedom - Genshin Impact Automation Tool'
  const titleGradient = createGradientLine(title, [0, 255, 255], [255, 100, 255])
  console.log(`  ${titleGradient}`)

  console.log(`  ${chalk.rgb(100, 100, 150)(`⚡ Version: ${process.env.CLI_VERSION || '0.1.0'} `)}${chalk.rgb(0, 255, 200)('• ')}${chalk.rgb(80, 80, 120)('Ready for automation')}`)
  console.log()
}

export async function main(): Promise<void> {
  displayLogo()

  const args = hideBin(process.argv)

  // 移除交互式模式，直接处理命令行参数

  // 使用 yargs 处理命令
  const cli = yargs(args)
    .scriptName('freedom')
    .usage('$0 <command> [options]')
    .command(gameCommand)
    .command(scriptCommand)
    .command(configCommand)
    .command(extensionCommand)
    .command(debugCommand)
    .demandCommand(1, chalk.red('You need to specify a command.'))
    .help('help', 'Show help information')
    .alias('help', 'h')
    .version('version', 'Show version information', process.env.CLI_VERSION || '0.1.0')
    .alias('version', 'v')
    .recommendCommands()
    .strict()
    .wrap(Math.min(120, process.stdout.columns || 80))

  try {
    await cli.argv
  }
  catch (error) {
    console.error(chalk.red('❌ Command execution failed:'), error instanceof Error ? error.message : 'Unknown error')
    process.exit(1)
  }
}
