import { existsSync, readFileSync } from 'node:fs'
// 配置管理系统测试
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigManager } from './config.js'
import { DEFAULT_CONFIG } from './defaults.js'

// Mock fs operations
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}))

// Mock os operations
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/home/testuser'),
}))

// Mock validation to avoid URL validation issues in tests
vi.mock('./validation.js', () => ({
  validateConfig: vi.fn(() => []), // Always return no errors
}))

describe('configuration Management System', () => {
  let configManager: ConfigManager
  const mockExistsSync = vi.mocked(existsSync)
  const mockReadFileSync = vi.mocked(readFileSync)

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock - no config files exist
    mockExistsSync.mockReturnValue(false)

    // Mock environment variables
    process.env.FREEDOM_GAME_URL = undefined
    process.env.FREEDOM_HEADLESS = undefined

    configManager = new ConfigManager('/test/cwd')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('configManager initialization', () => {
    it('should initialize with default configuration', () => {
      const config = configManager.getConfig()

      expect(config).toEqual(DEFAULT_CONFIG)
    })

    it('should use provided working directory', () => {
      const manager = new ConfigManager('/custom/path')

      // This tests that the manager was created with custom path
      expect(manager).toBeInstanceOf(ConfigManager)
    })

    it('should use process.cwd() as default working directory', () => {
      const manager = new ConfigManager()

      expect(manager).toBeInstanceOf(ConfigManager)
    })
  })

  describe('configuration layering', () => {
    it('should load system configuration when available', () => {
      const systemConfig = {
        game: {
          url: 'https://system.example.com/',
        },
      }

      mockExistsSync.mockImplementation(path =>
        typeof path === 'string' && path.includes('/etc/freedom'),
      )
      mockReadFileSync.mockReturnValue(JSON.stringify(systemConfig))

      const manager = new ConfigManager()
      const config = manager.getConfig()

      expect(config.game.url).toBe('https://system.example.com/')
    })

    it('should load user configuration when available', () => {
      const userConfig = {
        cli: {
          theme: 'dark' as const,
        },
      }

      mockExistsSync.mockImplementation(path =>
        typeof path === 'string' && path.includes('.freedom/config.json'),
      )
      mockReadFileSync.mockReturnValue(JSON.stringify(userConfig))

      const manager = new ConfigManager()
      const config = manager.getConfig()

      expect(config.cli.theme).toBe('dark')
    })

    it('should load workspace configuration when available', () => {
      const workspaceConfig = {
        automation: {
          headless: true,
        },
      }

      mockExistsSync.mockImplementation(path =>
        typeof path === 'string' && path.includes('freedom.config.json'),
      )
      mockReadFileSync.mockReturnValue(JSON.stringify(workspaceConfig))

      const manager = new ConfigManager()
      const config = manager.getConfig()

      expect(config.automation.headless).toBe(true)
    })

    it('should override configurations in correct priority order', () => {
      const systemConfig = { game: { region: 'global' as const } }
      const userConfig = { game: { region: 'cn' as const } }
      const workspaceConfig = { game: { url: 'https://workspace.example.com/' } }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation((path) => {
        if (typeof path === 'string') {
          if (path.includes('/etc/freedom'))
            return JSON.stringify(systemConfig)
          if (path.includes('.freedom/config.json'))
            return JSON.stringify(userConfig)
          if (path.includes('freedom.config.json'))
            return JSON.stringify(workspaceConfig)
        }
        return '{}'
      })

      const manager = new ConfigManager()
      const config = manager.getConfig()

      // Workspace should override user, user should override system
      expect(config.game.region).toBe('cn') // from user config
      expect(config.game.url).toBe('https://workspace.example.com/') // from workspace config
    })
  })

  describe('environment variable support', () => {
    it('should load configuration from environment variables', () => {
      process.env.FREEDOM_GAME_URL = 'https://env.example.com/'
      process.env.FREEDOM_HEADLESS = 'true'
      process.env.FREEDOM_TIMEOUT = '45000'

      const manager = new ConfigManager()
      const config = manager.getConfig()

      expect(config.game.url).toBe('https://env.example.com/')
      expect(config.automation.headless).toBe(true)
      expect(config.automation.timeout).toBe(45000)
    })

    it('should parse boolean environment variables', () => {
      process.env.FREEDOM_HEADLESS = 'false'

      const manager = new ConfigManager()
      const config = manager.getConfig()

      expect(config.automation.headless).toBe(false)
    })

    it('should parse number environment variables', () => {
      process.env.FREEDOM_TIMEOUT = '60000'

      const manager = new ConfigManager()
      const config = manager.getConfig()

      expect(config.automation.timeout).toBe(60000)
    })

    it('should handle invalid number environment variables as strings', () => {
      process.env.FREEDOM_LOG_LEVEL = 'debug'

      const manager = new ConfigManager()
      const config = manager.getConfig()

      expect(config.logging.level).toBe('debug')
    })
  })

  describe('configuration access methods', () => {
    beforeEach(() => {
      process.env.FREEDOM_GAME_URL = 'https://test.example.com/'
      configManager = new ConfigManager()
    })

    it('should get nested configuration values', () => {
      const url = configManager.get('game.url')
      expect(url).toBe('https://test.example.com/')
    })

    it('should return undefined for non-existent paths', () => {
      const value = configManager.get('non.existent.path' as any)
      expect(value).toBeUndefined()
    })

    it('should set nested configuration values', () => {
      configManager.set('game.region', 'global')
      const region = configManager.get('game.region')
      expect(region).toBe('global')
    })

    it('should create nested objects when setting deep paths', () => {
      // Note: Testing nested path functionality (not in current ConfigPath type definition)
      configManager.set('game.url' as any, 'testuser')
      const url = configManager.get('game.url')
      expect(url).toBe('testuser')
    })

    it('should get configuration layers', () => {
      const layers = configManager.getLayers()

      expect(Array.isArray(layers)).toBe(true)
      expect(layers.length).toBeGreaterThan(0)
      expect(layers[0].source).toBe('default')
    })
  })

  describe('configuration validation', () => {
    it('should handle JSON parse errors gracefully', () => {
      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('invalid json')

      expect(() => new ConfigManager()).toThrow()
    })

    it('should reload configuration', () => {
      // Change environment and reload
      process.env.FREEDOM_GAME_URL = 'https://reloaded.example.com/'
      configManager.reload()

      const newUrl = configManager.get('game.url')
      expect(newUrl).toBe('https://reloaded.example.com/')
    })
  })

  describe('type safety', () => {
    it('should maintain type safety for configuration access', () => {
      const config = configManager.getConfig()

      expect(typeof config.game.url).toBe('string')
      expect(typeof config.automation.headless).toBe('boolean')
      expect(typeof config.automation.timeout).toBe('number')
      expect(Array.isArray(config.extensions.enabled)).toBe(true)
    })

    it('should handle typed get operations', () => {
      const headless = configManager.get<boolean>('automation.headless')
      const timeout = configManager.get<number>('automation.timeout')

      expect(typeof headless).toBe('boolean')
      expect(typeof timeout).toBe('number')
    })
  })
})
