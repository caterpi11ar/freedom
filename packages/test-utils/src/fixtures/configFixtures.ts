// Configuration test fixtures
import type { FreedomConfig } from '@freedom/shared'

export const TEST_CONFIGS = {
  minimal: {
    game: {
      url: 'https://test.example.com/',
      region: 'cn' as const,
      language: 'zh-CN',
      autoLogin: false,
    },
    automation: {
      headless: true,
      slowMo: 0,
      timeout: 5000,
      retryAttempts: 1,
      enableScreenshots: false,
      screenshotPath: '/tmp/test-screenshots',
    },
    cli: {
      theme: 'dark' as const,
      verbosity: 'quiet' as const,
      interactive: false,
      autoUpdate: false,
      locale: 'en-US',
    },
    extensions: {
      enabled: [],
      disabled: [],
      autoInstall: false,
      updateCheck: false,
    },
    logging: {
      level: 'error' as const,
      maxSize: '1MB',
      maxFiles: 1,
      enableConsole: false,
    },
    security: {
      enableTelemetry: false,
      allowRemoteControl: false,
      trustedDomains: ['test.example.com'],
    },
  } satisfies FreedomConfig,

  development: {
    game: {
      url: 'https://dev.example.com/',
      region: 'global' as const,
      language: 'en-US',
      autoLogin: true,
    },
    automation: {
      headless: false,
      slowMo: 100,
      timeout: 10000,
      retryAttempts: 3,
      enableScreenshots: true,
      screenshotPath: './dev-screenshots',
    },
    cli: {
      theme: 'auto' as const,
      verbosity: 'verbose' as const,
      interactive: true,
      autoUpdate: true,
      locale: 'en-US',
    },
    extensions: {
      enabled: ['dev-tools', 'debugger'],
      disabled: [],
      autoInstall: true,
      updateCheck: true,
    },
    logging: {
      level: 'debug' as const,
      maxSize: '50MB',
      maxFiles: 10,
      enableConsole: true,
    },
    security: {
      enableTelemetry: true,
      allowRemoteControl: true,
      trustedDomains: ['dev.example.com', 'localhost'],
    },
  } satisfies FreedomConfig,

  production: {
    game: {
      url: 'https://ys.mihoyo.com/cloud/',
      region: 'cn' as const,
      language: 'zh-CN',
      autoLogin: false,
    },
    automation: {
      headless: true,
      slowMo: 50,
      timeout: 30000,
      retryAttempts: 5,
      enableScreenshots: true,
      screenshotPath: './screenshots',
    },
    cli: {
      theme: 'auto' as const,
      verbosity: 'normal' as const,
      interactive: true,
      autoUpdate: false,
      locale: 'zh-CN',
    },
    extensions: {
      enabled: ['core-features'],
      disabled: ['dev-tools', 'debugger'],
      autoInstall: false,
      updateCheck: true,
    },
    logging: {
      level: 'info' as const,
      maxSize: '10MB',
      maxFiles: 5,
      enableConsole: true,
    },
    security: {
      enableTelemetry: false,
      allowRemoteControl: false,
      trustedDomains: ['mihoyo.com', 'hoyoverse.com', 'ys.mihoyo.com'],
    },
  } satisfies FreedomConfig,
}

export const INVALID_CONFIGS = {
  invalidRegion: {
    game: {
      region: 'invalid-region', // Should be 'cn' or 'global'
    },
  },
  invalidTheme: {
    cli: {
      theme: 'rainbow', // Should be 'dark', 'light', or 'auto'
    },
  },
  invalidLogLevel: {
    logging: {
      level: 'trace', // Should be 'error', 'warn', 'info', or 'debug'
    },
  },
}

// Environment variable test fixtures
export const ENV_FIXTURES = {
  complete: {
    FREEDOM_GAME_URL: 'https://env.example.com/',
    FREEDOM_GAME_REGION: 'global',
    FREEDOM_HEADLESS: 'true',
    FREEDOM_TIMEOUT: '45000',
    FREEDOM_LOG_LEVEL: 'debug',
    FREEDOM_THEME: 'dark',
    FREEDOM_VERBOSE: 'verbose',
  },
  partial: {
    FREEDOM_GAME_URL: 'https://partial.example.com/',
    FREEDOM_HEADLESS: 'false',
  },
  invalid: {
    FREEDOM_TIMEOUT: 'not-a-number',
    FREEDOM_HEADLESS: 'maybe',
  },
}
