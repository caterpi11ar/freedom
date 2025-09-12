import type { CommandModule } from 'yargs'

import type { ExtensionContext } from '../../extensions/index.js'
// 安装扩展命令
import process from 'node:process'
import { getAllConfigValues } from '@freedom/shared/config'
import chalk from 'chalk'
import { ExtensionManager } from '../../extensions/index.js'
import { GameAutomationError } from '../../utils/errors.js'

export const installCommand: CommandModule = {
  command: 'install <source>',
  describe: 'Install an extension from various sources',
  builder: yargs =>
    yargs
      .positional('source', {
        describe: 'Extension source: name (registry), path (local), or git URL',
        type: 'string',
        demandOption: true,
      })
      .option('force', {
        alias: 'f',
        describe: 'Force installation even if already exists',
        type: 'boolean',
        default: false,
      })
      .option('version', {
        alias: 'v',
        describe: 'Specific version to install',
        type: 'string',
      })
      .option('enable', {
        describe: 'Enable extension after installation',
        type: 'boolean',
        default: true,
      })
      .option('registry', {
        describe: 'Extension registry URL',
        type: 'string',
        default: 'https://registry.freedom-extensions.com',
      }),
  handler: async (argv) => {
    try {
      console.log(chalk.green(`📥 Installing extension: ${chalk.cyan(argv.source)}`))

      if (argv.version) {
        console.log(chalk.gray(`Version: ${argv.version}`))
      }

      console.log(chalk.gray(`Force: ${argv.force ? 'Yes' : 'No'}`))
      console.log(chalk.gray(`Enable after install: ${argv.enable ? 'Yes' : 'No'}`))
      console.log()

      // 确定源类型
      const sourceType = detectSourceType(argv.source as string)
      console.log(chalk.blue(`Source type detected: ${sourceType}`))

      switch (sourceType) {
        case 'registry':
          console.log(chalk.gray(`Registry: ${argv.registry}`))
          break
        case 'git':
          console.log(chalk.gray('Cloning from Git repository...'))
          break
        case 'local':
          console.log(chalk.gray('Installing from local path...'))
          break
      }

      // 创建扩展管理器上下文
      const context: ExtensionContext = {
        config: getAllConfigValues() as any,
        logger: {
          info: (message: string) => console.log(chalk.blue('ℹ️ '), message),
          warn: (message: string) => console.log(chalk.yellow('⚠️ '), message),
          error: (message: string) => console.log(chalk.red('❌'), message),
        },
        api: {
          registerCommand: (name: string, _handler: (...args: any[]) => void) => {
            console.log(chalk.gray(`Registered command: ${name}`))
          },
          registerHook: (event: string, _handler: (...args: any[]) => void) => {
            console.log(chalk.gray(`Registered hook: ${event}`))
          },
        },
      }

      const extensionManager = new ExtensionManager(context)
      await extensionManager.initialize()

      // 检查是否已存在
      const extensionName = extractExtensionName(argv.source as string)
      if (!argv.force) {
        const existing = extensionManager.findExtension(extensionName)
        if (existing) {
          throw new GameAutomationError(`Extension "${existing.manifest.name}" is already installed. Use --force to reinstall.`)
        }
      }

      const installation = await extensionManager.installExtension(extensionName, {
        source: sourceType,
        version: argv.version as string | undefined,
        force: argv.force as boolean | undefined,
      })

      if (argv.enable) {
        await extensionManager.enableExtension(installation.manifest.name)
      }

      console.log(chalk.cyan('💡 Run "freedom extension list" to see installed extensions'))
    }
    catch (error) {
      if (error instanceof GameAutomationError) {
        console.error(chalk.red('❌ Installation failed:'), error.message)
        process.exit(1)
      }
      throw error
    }
  },
}

function detectSourceType(source: string): 'registry' | 'git' | 'local' {
  if (source.includes('://') && (source.includes('github.com') || source.includes('gitlab.com') || source.endsWith('.git'))) {
    return 'git'
  }

  if (source.includes('/') || source.includes('\\') || source.startsWith('.') || source.startsWith('~')) {
    return 'local'
  }

  return 'registry'
}

function extractExtensionName(source: string): string {
  // 从各种源格式中提取扩展名
  if (source.includes('://')) {
    // Git URL: extract repo name
    const parts = source.split('/')
    return parts[parts.length - 1].replace('.git', '')
  }

  if (source.includes('/')) {
    // Local path: extract directory name
    const parts = source.split(/[/\\]/)
    return parts[parts.length - 1]
  }

  // Registry name: use as-is
  return source
}
