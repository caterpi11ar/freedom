// 默认配置值
import type { FreedomConfig } from './schema.js'
import process from 'node:process'

export const DEFAULT_CONFIG: FreedomConfig = {
  game: {
    url: 'https://ys.mihoyo.com/cloud/',
    region: 'cn',
    language: 'zh-CN',
    autoLogin: false,
  },

  automation: {
    headless: false,
    slowMo: 100,
    timeout: 30000,
    retryAttempts: 3,
    enableScreenshots: true,
    screenshotPath: './screenshots',
  },

  cli: {
    theme: 'auto',
    verbosity: 'normal',
    interactive: true,
    autoUpdate: false,
    locale: 'zh-CN',
  },

  extensions: {
    enabled: [],
    disabled: [],
    autoInstall: false,
    updateCheck: true,
  },

  logging: {
    level: 'info',
    maxSize: '10MB',
    maxFiles: 5,
    enableConsole: true,
  },

  security: {
    enableTelemetry: false,
    allowRemoteControl: false,
    trustedDomains: [
      'mihoyo.com',
      'hoyoverse.com',
      'ys.mihoyo.com',
    ],
  },
}

// 环境变量映射
export const ENV_MAPPING: Record<string, string> = {
  FREEDOM_GAME_URL: 'game.url',
  FREEDOM_GAME_REGION: 'game.region',
  FREEDOM_HEADLESS: 'automation.headless',
  FREEDOM_TIMEOUT: 'automation.timeout',
  FREEDOM_LOG_LEVEL: 'logging.level',
  FREEDOM_THEME: 'cli.theme',
  FREEDOM_VERBOSE: 'cli.verbosity',
}

// 配置文件搜索路径
export const CONFIG_PATHS = {
  // 全局配置文件路径
  global: [
    '~/.freedom/config.json',
    '~/.config/freedom/config.json',
  ],

  // 项目本地配置文件路径
  local: [
    './freedom.config.json',
    './.freedom/config.json',
    './config/freedom.json',
  ],

  // 系统配置文件路径
  system: [
    '/etc/freedom/config.json',
    '/usr/local/etc/freedom/config.json',
  ],
}

// Windows平台配置路径
if (process.platform === 'win32') {
  CONFIG_PATHS.global.unshift(
    '%APPDATA%/Freedom/config.json',
    '%LOCALAPPDATA%/Freedom/config.json',
  )
  CONFIG_PATHS.system.unshift(
    '%PROGRAMDATA%/Freedom/config.json',
  )
}
