import type { ExtensionManifest } from './ExtensionLoader.js'
// 扩展开发工具 - 提供扩展开发和调试支持
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import chalk from 'chalk'
import { GameAutomationError } from '../utils/errors.js'

export interface ExtensionTemplate {
  name: string
  description: string
  files: Array<{
    path: string
    content: string
  }>
}

export interface ExtensionDevOptions {
  name: string
  description?: string
  author?: string
  version?: string
  template?: string
  typescript?: boolean
}

export class ExtensionDeveloper {
  private outputDir: string

  constructor() {
    this.outputDir = path.join(process.cwd(), 'extensions')
  }

  /**
   * 创建新扩展
   */
  async createExtension(options: ExtensionDevOptions): Promise<string> {
    const { name, description, author, version = '1.0.0', template = 'basic', typescript = true } = options

    console.log(chalk.blue(`🛠️  Creating extension: ${chalk.cyan(name)}`))
    console.log(chalk.gray(`Template: ${template}`))
    console.log(chalk.gray(`TypeScript: ${typescript ? 'Yes' : 'No'}`))

    try {
      // 验证扩展名
      if (!this.isValidExtensionName(name)) {
        throw new GameAutomationError('Invalid extension name. Use lowercase letters, numbers, and hyphens only.')
      }

      // 检查是否已存在
      const extensionDir = path.join(this.outputDir, name)
      try {
        await stat(extensionDir)
        throw new GameAutomationError(`Extension directory "${extensionDir}" already exists`)
      }
      catch (error) {
        if (error instanceof GameAutomationError)
          throw error
        // 目录不存在，继续
      }

      // 创建扩展目录
      await mkdir(extensionDir, { recursive: true })

      // 生成扩展文件
      await this.generateExtensionFiles(extensionDir, {
        name,
        description: description || `Extension ${name}`,
        author: author || 'Extension Developer',
        version,
        template,
        typescript,
      })

      console.log(chalk.green(`✅ Extension created successfully at: ${extensionDir}`))
      console.log(chalk.cyan('\nNext steps:'))
      console.log(chalk.white(`  cd extensions/${name}`))
      console.log(chalk.white('  npm install'))
      console.log(chalk.white('  freedom extension install .'))

      return extensionDir
    }
    catch (error) {
      const createError = error instanceof Error ? error : new Error('Unknown error')
      console.error(chalk.red(`❌ Failed to create extension: ${createError.message}`))
      throw createError
    }
  }

  /**
   * 生成扩展文件
   */
  private async generateExtensionFiles(
    extensionDir: string,
    options: Required<Omit<ExtensionDevOptions, 'template'>> & { template: string },
  ): Promise<void> {
    const { name, description, author, version, typescript } = options

    // 生成 package.json
    const manifest: ExtensionManifest = {
      name,
      version,
      description,
      main: typescript ? 'dist/index.js' : 'index.js',
      author,
      license: 'MIT',
      keywords: ['freedom', 'extension', 'automation'],
      freedomVersion: '^0.1.0',
      permissions: ['config.read', 'logger.write'],
      scripts: typescript
        ? {
            build: 'tsc',
            dev: 'tsc --watch',
            start: 'node dist/index.js',
          }
        : {
            start: 'node index.js',
          },
    }

    if (typescript) {
      manifest.dependencies = {
        '@freedom/shared': '^0.1.0',
      }
      manifest.dependencies = {
        ...manifest.dependencies,
        'typescript': '^5.0.0',
        '@types/node': '^20.0.0',
      }
    }

    await writeFile(
      path.join(extensionDir, 'package.json'),
      JSON.stringify(manifest, null, 2),
    )

    // 生成主文件
    if (typescript) {
      await this.generateTypeScriptFiles(extensionDir, options)
    }
    else {
      await this.generateJavaScriptFiles(extensionDir, options)
    }

    // 生成 README
    await this.generateReadme(extensionDir, options)
  }

  /**
   * 生成 TypeScript 文件
   */
  private async generateTypeScriptFiles(
    extensionDir: string,
    options: Required<Omit<ExtensionDevOptions, 'template'>> & { template: string },
  ): Promise<void> {
    const { name, description } = options

    // 生成 tsconfig.json
    const tsConfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: 'dist',
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    }

    await writeFile(
      path.join(extensionDir, 'tsconfig.json'),
      JSON.stringify(tsConfig, null, 2),
    )

    // 创建 src 目录
    await mkdir(path.join(extensionDir, 'src'), { recursive: true })

    // 生成主 TypeScript 文件
    const mainContent = `import type { ExtensionContext } from '@freedom/shared'

/**
 * ${description}
 */
export class ${this.toPascalCase(name)}Extension {
  private context: ExtensionContext

  constructor(context: ExtensionContext) {
    this.context = context
  }

  /**
   * 扩展启用时调用
   */
  async onEnable(): Promise<void> {
    this.context.logger.info('${name} extension enabled')
    
    // TODO: 实现扩展启用逻辑
    // 例如：注册命令、事件监听器等
    
    // 示例：注册自定义命令
    if (this.context.api.registerCommand) {
      this.context.api.registerCommand('${name}:hello', this.handleHelloCommand.bind(this))
    }
  }

  /**
   * 扩展禁用时调用
   */
  async onDisable(): Promise<void> {
    this.context.logger.info('${name} extension disabled')
    
    // TODO: 实现扩展禁用逻辑
    // 例如：清理资源、取消注册等
  }

  /**
   * 扩展卸载时调用
   */
  async onUnload(): Promise<void> {
    this.context.logger.info('${name} extension unloaded')
    
    // TODO: 实现扩展卸载逻辑
    // 例如：保存状态、释放资源等
  }

  /**
   * 示例命令处理器
   */
  private async handleHelloCommand(...args: any[]): Promise<void> {
    this.context.logger.info(\`Hello from \${name} extension! Args: \${JSON.stringify(args)}\`)
  }
}

// 扩展入口点
let extensionInstance: ${this.toPascalCase(name)}Extension | null = null

export async function onEnable(context: ExtensionContext): Promise<void> {
  extensionInstance = new ${this.toPascalCase(name)}Extension(context)
  await extensionInstance.onEnable()
}

export async function onDisable(context: ExtensionContext): Promise<void> {
  if (extensionInstance) {
    await extensionInstance.onDisable()
  }
}

export async function onUnload(context: ExtensionContext): Promise<void> {
  if (extensionInstance) {
    await extensionInstance.onUnload()
    extensionInstance = null
  }
}
`

    await writeFile(path.join(extensionDir, 'src', 'index.ts'), mainContent)
  }

  /**
   * 生成 JavaScript 文件
   */
  private async generateJavaScriptFiles(
    extensionDir: string,
    options: Required<Omit<ExtensionDevOptions, 'template'>> & { template: string },
  ): Promise<void> {
    const { name, description } = options

    const mainContent = `/**
 * ${description}
 */
class ${this.toPascalCase(name)}Extension {
  constructor(context) {
    this.context = context
  }

  /**
   * 扩展启用时调用
   */
  async onEnable() {
    this.context.logger.info('${name} extension enabled')
    
    // TODO: 实现扩展启用逻辑
    // 例如：注册命令、事件监听器等
    
    // 示例：注册自定义命令
    if (this.context.api.registerCommand) {
      this.context.api.registerCommand('${name}:hello', this.handleHelloCommand.bind(this))
    }
  }

  /**
   * 扩展禁用时调用
   */
  async onDisable() {
    this.context.logger.info('${name} extension disabled')
    
    // TODO: 实现扩展禁用逻辑
    // 例如：清理资源、取消注册等
  }

  /**
   * 扩展卸载时调用
   */
  async onUnload() {
    this.context.logger.info('${name} extension unloaded')
    
    // TODO: 实现扩展卸载逻辑
    // 例如：保存状态、释放资源等
  }

  /**
   * 示例命令处理器
   */
  async handleHelloCommand(...args) {
    this.context.logger.info(\`Hello from \${name} extension! Args: \${JSON.stringify(args)}\`)
  }
}

// 扩展入口点
let extensionInstance = null

export async function onEnable(context) {
  extensionInstance = new ${this.toPascalCase(name)}Extension(context)
  await extensionInstance.onEnable()
}

export async function onDisable(context) {
  if (extensionInstance) {
    await extensionInstance.onDisable()
  }
}

export async function onUnload(context) {
  if (extensionInstance) {
    await extensionInstance.onUnload()
    extensionInstance = null
  }
}
`

    await writeFile(path.join(extensionDir, 'index.js'), mainContent)
  }

  /**
   * 生成 README 文件
   */
  private async generateReadme(
    extensionDir: string,
    options: Required<Omit<ExtensionDevOptions, 'template'>> & { template: string },
  ): Promise<void> {
    const { name, description, author, version } = options

    const readme = `# ${this.toTitleCase(name)} Extension

${description}

## Information

- **Version**: ${version}
- **Author**: ${author}
- **License**: MIT

## Installation

\`\`\`bash
# Install from local directory
freedom extension install .

# Or install from npm (if published)
freedom extension install ${name}
\`\`\`

## Usage

After installation, enable the extension:

\`\`\`bash
freedom extension enable ${name}
\`\`\`

## Commands

This extension provides the following commands:

- \`${name}:hello\` - Example command that logs a hello message

## Development

### Building (TypeScript extensions only)

\`\`\`bash
npm run build
\`\`\`

### Development Mode (TypeScript extensions only)

\`\`\`bash
npm run dev
\`\`\`

### Testing

\`\`\`bash
# Install the extension in development mode
freedom extension install . --force

# Enable the extension
freedom extension enable ${name}

# Test the extension commands
freedom script run --command "${name}:hello"
\`\`\`

## Extension Structure

\`\`\`
${name}/
├── package.json          # Extension manifest
├── README.md             # This file
${options.typescript ? '├── tsconfig.json        # TypeScript configuration' : ''}
${options.typescript ? '├── src/' : ''}
${options.typescript ? '│   └── index.ts        # Main extension file' : '├── index.js             # Main extension file'}
${options.typescript ? '└── dist/               # Built files (TypeScript)' : ''}
\`\`\`

## Extension API

Your extension can access the following context:

\`\`\`${options.typescript ? 'typescript' : 'javascript'}
interface ExtensionContext {
  config: FreedomConfig
  logger: {
    info: (message: string) => void
    warn: (message: string) => void
    error: (message: string) => void
  }
  api: {
    registerCommand?: (name: string, handler: Function) => void
    registerHook?: (event: string, handler: Function) => void
  }
}
\`\`\`

## License

MIT
`

    await writeFile(path.join(extensionDir, 'README.md'), readme)
  }

  /**
   * 验证扩展名是否有效
   */
  private isValidExtensionName(name: string): boolean {
    return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(name) && name.length >= 2 && name.length <= 50
  }

  /**
   * 转换为 PascalCase
   */
  private toPascalCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('')
  }

  /**
   * 转换为 Title Case
   */
  private toTitleCase(str: string): string {
    return str
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  /**
   * 验证扩展
   */
  async validateExtension(extensionPath: string): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    const errors: string[] = []
    const warnings: string[] = []

    try {
      // 检查 package.json
      const manifestPath = path.join(extensionPath, 'package.json')
      const manifestContent = await readFile(manifestPath, 'utf-8')
      const manifest: ExtensionManifest = JSON.parse(manifestContent)

      // 必需字段验证
      if (!manifest.name)
        errors.push('Missing required field: name')
      if (!manifest.version)
        errors.push('Missing required field: version')
      if (!manifest.main)
        errors.push('Missing required field: main')

      // 字段格式验证
      if (manifest.name && !this.isValidExtensionName(manifest.name)) {
        errors.push('Invalid extension name format')
      }

      // 检查主文件是否存在
      if (manifest.main) {
        const mainPath = path.join(extensionPath, manifest.main)
        try {
          await stat(mainPath)
        }
        catch {
          errors.push(`Main file not found: ${manifest.main}`)
        }
      }

      // 警告检查
      if (!manifest.description)
        warnings.push('Missing description field')
      if (!manifest.author)
        warnings.push('Missing author field')
      if (!manifest.license)
        warnings.push('Missing license field')
    }
    catch (error) {
      errors.push(`Failed to read or parse package.json: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * 生成扩展脚手架
   */
  async scaffold(name: string, template: string = 'basic'): Promise<string> {
    return this.createExtension({
      name,
      template,
      typescript: true,
    })
  }
}
