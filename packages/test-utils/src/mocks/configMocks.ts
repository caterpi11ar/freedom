import type { FreedomConfig } from '@freedom/shared'

// Configuration mocks for testing
import process from 'node:process'

export class MockConfigManager {
  private config: FreedomConfig = {
    game: {
      url: 'https://mock.example.com/',
      region: 'cn',
      language: 'zh-CN',
      autoLogin: false,
    },
    automation: {
      headless: true,
      slowMo: 0,
      timeout: 5000,
      retryAttempts: 1,
      enableScreenshots: false,
      screenshotPath: '/tmp/mock-screenshots',
    },
    cli: {
      theme: 'dark',
      verbosity: 'quiet',
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
      level: 'error',
      maxSize: '1MB',
      maxFiles: 1,
      enableConsole: false,
    },
    security: {
      enableTelemetry: false,
      allowRemoteControl: false,
      trustedDomains: ['mock.example.com'],
    },
  }

  getConfig(): FreedomConfig {
    return { ...this.config }
  }

  get<T = unknown>(path: string): T | undefined {
    const keys = path.split('.')
    let value: any = this.config

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key]
      }
      else {
        return undefined
      }
    }

    return value as T
  }

  set(path: string, value: unknown): void {
    const keys = path.split('.')
    let target: any = this.config

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {}
      }
      target = target[key]
    }

    const lastKey = keys[keys.length - 1]
    target[lastKey] = value
  }

  reset(): void {
    this.config = {
      game: {
        url: 'https://mock.example.com/',
        region: 'cn',
        language: 'zh-CN',
        autoLogin: false,
      },
      automation: {
        headless: true,
        slowMo: 0,
        timeout: 5000,
        retryAttempts: 1,
        enableScreenshots: false,
        screenshotPath: '/tmp/mock-screenshots',
      },
      cli: {
        theme: 'dark',
        verbosity: 'quiet',
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
        level: 'error',
        maxSize: '1MB',
        maxFiles: 1,
        enableConsole: false,
      },
      security: {
        enableTelemetry: false,
        allowRemoteControl: false,
        trustedDomains: ['mock.example.com'],
      },
    }
  }
}

export const mockConfigManager = new MockConfigManager()

// Mock environment variables
export const mockEnvironment = {
  FREEDOM_GAME_URL: 'https://mock-env.example.com/',
  FREEDOM_GAME_REGION: 'global',
  FREEDOM_HEADLESS: 'true',
  FREEDOM_TIMEOUT: '10000',
  FREEDOM_LOG_LEVEL: 'debug',
  FREEDOM_THEME: 'auto',
  FREEDOM_VERBOSE: 'verbose',
}

// Helper to set up mock environment
export function setupMockEnvironment(): void {
  Object.entries(mockEnvironment).forEach(([key, value]) => {
    process.env[key] = value
  })
}

// Helper to clean up mock environment
export function cleanupMockEnvironment(): void {
  Object.keys(mockEnvironment).forEach((key) => {
    delete process.env[key]
  })
}
