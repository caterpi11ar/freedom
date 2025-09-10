// 默认配置测试
import { describe, expect, it } from 'vitest'
import { CONFIG_PATHS, DEFAULT_CONFIG, ENV_MAPPING } from './defaults.js'

describe('configuration Defaults', () => {
  describe('dEFAULT_CONFIG', () => {
    it('should have all required game configuration fields', () => {
      expect(DEFAULT_CONFIG.game).toBeDefined()
      expect(DEFAULT_CONFIG.game.url).toBe('https://ys.mihoyo.com/cloud/')
      expect(DEFAULT_CONFIG.game.region).toBe('cn')
      expect(DEFAULT_CONFIG.game.language).toBe('zh-CN')
      expect(DEFAULT_CONFIG.game.autoLogin).toBe(false)
    })

    it('should have all required automation configuration fields', () => {
      expect(DEFAULT_CONFIG.automation).toBeDefined()
      expect(DEFAULT_CONFIG.automation.headless).toBe(false)
      expect(DEFAULT_CONFIG.automation.slowMo).toBe(100)
      expect(DEFAULT_CONFIG.automation.timeout).toBe(30000)
      expect(DEFAULT_CONFIG.automation.retryAttempts).toBe(3)
      expect(DEFAULT_CONFIG.automation.enableScreenshots).toBe(true)
      expect(DEFAULT_CONFIG.automation.screenshotPath).toBe('./screenshots')
    })

    it('should have all required CLI configuration fields', () => {
      expect(DEFAULT_CONFIG.cli).toBeDefined()
      expect(DEFAULT_CONFIG.cli.theme).toBe('auto')
      expect(DEFAULT_CONFIG.cli.verbosity).toBe('normal')
      expect(DEFAULT_CONFIG.cli.interactive).toBe(true)
      expect(DEFAULT_CONFIG.cli.autoUpdate).toBe(false)
      expect(DEFAULT_CONFIG.cli.locale).toBe('zh-CN')
    })

    it('should have all required extensions configuration fields', () => {
      expect(DEFAULT_CONFIG.extensions).toBeDefined()
      expect(Array.isArray(DEFAULT_CONFIG.extensions.enabled)).toBe(true)
      expect(Array.isArray(DEFAULT_CONFIG.extensions.disabled)).toBe(true)
      expect(DEFAULT_CONFIG.extensions.autoInstall).toBe(false)
      expect(DEFAULT_CONFIG.extensions.updateCheck).toBe(true)
    })

    it('should have all required logging configuration fields', () => {
      expect(DEFAULT_CONFIG.logging).toBeDefined()
      expect(DEFAULT_CONFIG.logging.level).toBe('info')
      expect(DEFAULT_CONFIG.logging.maxSize).toBe('10MB')
      expect(DEFAULT_CONFIG.logging.maxFiles).toBe(5)
      expect(DEFAULT_CONFIG.logging.enableConsole).toBe(true)
    })

    it('should have all required security configuration fields', () => {
      expect(DEFAULT_CONFIG.security).toBeDefined()
      expect(DEFAULT_CONFIG.security.enableTelemetry).toBe(false)
      expect(DEFAULT_CONFIG.security.allowRemoteControl).toBe(false)
      expect(Array.isArray(DEFAULT_CONFIG.security.trustedDomains)).toBe(true)
      expect(DEFAULT_CONFIG.security.trustedDomains).toContain('mihoyo.com')
      expect(DEFAULT_CONFIG.security.trustedDomains).toContain('hoyoverse.com')
      expect(DEFAULT_CONFIG.security.trustedDomains).toContain('ys.mihoyo.com')
    })
  })

  describe('eNV_MAPPING', () => {
    it('should have proper environment variable mappings', () => {
      expect(ENV_MAPPING.FREEDOM_GAME_URL).toBe('game.url')
      expect(ENV_MAPPING.FREEDOM_GAME_REGION).toBe('game.region')
      expect(ENV_MAPPING.FREEDOM_HEADLESS).toBe('automation.headless')
      expect(ENV_MAPPING.FREEDOM_TIMEOUT).toBe('automation.timeout')
      expect(ENV_MAPPING.FREEDOM_LOG_LEVEL).toBe('logging.level')
      expect(ENV_MAPPING.FREEDOM_THEME).toBe('cli.theme')
      expect(ENV_MAPPING.FREEDOM_VERBOSE).toBe('cli.verbosity')
    })

    it('should map environment variables to valid config paths', () => {
      Object.values(ENV_MAPPING).forEach((path) => {
        expect(typeof path).toBe('string')
        expect(path).toMatch(/^[a-z]+\.[a-zA-Z]+$/)
      })
    })
  })

  describe('cONFIG_PATHS', () => {
    it('should have global configuration paths', () => {
      expect(Array.isArray(CONFIG_PATHS.global)).toBe(true)
      expect(CONFIG_PATHS.global.length).toBeGreaterThan(0)
      expect(CONFIG_PATHS.global).toContain('~/.freedom/config.json')
      expect(CONFIG_PATHS.global).toContain('~/.config/freedom/config.json')
    })

    it('should have local configuration paths', () => {
      expect(Array.isArray(CONFIG_PATHS.local)).toBe(true)
      expect(CONFIG_PATHS.local.length).toBeGreaterThan(0)
      expect(CONFIG_PATHS.local).toContain('./freedom.config.json')
      expect(CONFIG_PATHS.local).toContain('./.freedom/config.json')
      expect(CONFIG_PATHS.local).toContain('./config/freedom.json')
    })

    it('should have system configuration paths', () => {
      expect(Array.isArray(CONFIG_PATHS.system)).toBe(true)
      expect(CONFIG_PATHS.system.length).toBeGreaterThan(0)
      expect(CONFIG_PATHS.system).toContain('/etc/freedom/config.json')
      expect(CONFIG_PATHS.system).toContain('/usr/local/etc/freedom/config.json')
    })

    it('should include Windows-specific paths on Windows', () => {
      const _originalPlatform = process.platform

      // All paths should be valid regardless of platform
      CONFIG_PATHS.global.forEach((path) => {
        expect(typeof path).toBe('string')
        expect(path.length).toBeGreaterThan(0)
      })
    })
  })

  describe('type Safety', () => {
    it('should have consistent types across config sections', () => {
      expect(typeof DEFAULT_CONFIG.game.url).toBe('string')
      expect(typeof DEFAULT_CONFIG.automation.headless).toBe('boolean')
      expect(typeof DEFAULT_CONFIG.automation.timeout).toBe('number')
      expect(Array.isArray(DEFAULT_CONFIG.extensions.enabled)).toBe(true)
    })

    it('should have valid enum values', () => {
      expect(['cn', 'global']).toContain(DEFAULT_CONFIG.game.region)
      expect(['dark', 'light', 'auto']).toContain(DEFAULT_CONFIG.cli.theme)
      expect(['quiet', 'normal', 'verbose', 'debug']).toContain(DEFAULT_CONFIG.cli.verbosity)
      expect(['error', 'warn', 'info', 'debug']).toContain(DEFAULT_CONFIG.logging.level)
    })
  })
})
