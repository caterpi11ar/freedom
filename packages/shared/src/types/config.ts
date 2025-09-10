// Freedom 配置类型定义
export interface FreedomConfig {
  // 游戏相关配置
  game: {
    url: string
    region: 'cn' | 'global'
    language: string
    autoLogin: boolean
    credentials?: {
      username?: string
      // 密码通过安全存储管理，不在配置文件中
    }
  }

  // 自动化配置
  automation: {
    headless: boolean
    slowMo: number
    timeout: number
    retryAttempts: number
    enableScreenshots: boolean
    screenshotPath: string
  }

  // CLI 配置
  cli: {
    theme: 'dark' | 'light' | 'auto'
    verbosity: 'quiet' | 'normal' | 'verbose' | 'debug'
    interactive: boolean
    autoUpdate: boolean
    locale: string
  }

  // 扩展配置
  extensions: {
    enabled: string[]
    disabled: string[]
    autoInstall: boolean
    updateCheck: boolean
  }

  // 日志配置
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'
    file?: string
    maxSize: string
    maxFiles: number
    enableConsole: boolean
  }

  // 安全配置
  security: {
    enableTelemetry: boolean
    allowRemoteControl: boolean
    trustedDomains: string[]
  }
}

// 部分配置类型，用于更新操作
export type PartialConfig = Partial<FreedomConfig>

// 配置路径类型，支持嵌套键访问如 'game.region'
export type ConfigPath
  = | keyof FreedomConfig
    | `game.${keyof FreedomConfig['game']}`
    | `automation.${keyof FreedomConfig['automation']}`
    | `cli.${keyof FreedomConfig['cli']}`
    | `extensions.${keyof FreedomConfig['extensions']}`
    | `logging.${keyof FreedomConfig['logging']}`
    | `security.${keyof FreedomConfig['security']}`

// 配置验证错误
export interface ConfigValidationError {
  path: string
  message: string
  value?: unknown
}

// 配置来源类型
export type ConfigSource = 'default' | 'system' | 'user' | 'workspace' | 'env' | 'cli'

export interface ConfigLayer {
  source: ConfigSource
  config: Partial<FreedomConfig>
  filePath?: string
}
