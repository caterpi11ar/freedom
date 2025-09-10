// 游戏启动命令测试
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startCommand } from './start.js'

// Mock dependencies
vi.mock('chalk', () => ({
  default: {
    green: vi.fn(text => text),
    gray: vi.fn(text => text),
    yellow: vi.fn(text => text),
    cyan: vi.fn(text => text),
  },
}))

vi.mock('../../config/config.js', () => ({
  getConfigValue: vi.fn((path) => {
    const mockConfig = {
      'automation.headless': false,
      'game.url': 'https://ys.mihoyo.com/cloud/',
      'game.region': 'cn',
      'automation.timeout': 30000,
    }
    return mockConfig[path as keyof typeof mockConfig]
  }),
}))

describe('game Start Command', () => {
  const mockConsoleLog = vi.spyOn(console, 'log')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('command definition', () => {
    it('should have correct command structure', () => {
      expect(startCommand.command).toBe('start [profile]')
      expect(startCommand.describe).toBe('Start a game automation session')
      expect(typeof startCommand.builder).toBe('function')
      expect(typeof startCommand.handler).toBe('function')
    })

    it('should configure yargs with correct options', () => {
      const mockYargs = {
        positional: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis(),
      }

      const builder = startCommand.builder as (yargs: any) => any
      builder(mockYargs)

      expect(mockYargs.positional).toHaveBeenCalledWith('profile', {
        describe: 'Game profile to use',
        type: 'string',
        default: 'default',
      })

      expect(mockYargs.option).toHaveBeenCalledWith('headless', expect.objectContaining({
        alias: 'h',
        describe: 'Run in headless mode',
        type: 'boolean',
      }))

      expect(mockYargs.option).toHaveBeenCalledWith('url', expect.objectContaining({
        alias: 'u',
        describe: 'Game URL to navigate to',
        type: 'string',
      }))

      expect(mockYargs.option).toHaveBeenCalledWith('region', expect.objectContaining({
        alias: 'r',
        describe: 'Game region',
        type: 'string',
        choices: ['cn', 'global'],
      }))

      expect(mockYargs.option).toHaveBeenCalledWith('timeout', expect.objectContaining({
        alias: 't',
        describe: 'Session timeout in seconds',
        type: 'number',
      }))
    })
  })

  describe('command execution', () => {
    it('should execute with default arguments', async () => {
      const argv = {
        profile: 'default',
        headless: false,
        url: 'https://ys.mihoyo.com/cloud/',
        region: 'cn',
        timeout: 30000,
        _: [],
        $0: 'freedom',
      }

      await startCommand.handler!(argv as any)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Starting game automation session'),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Profile: default'),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Headless: No'),
      )
    })

    it('should execute with custom arguments', async () => {
      const argv = {
        profile: 'test-profile',
        headless: true,
        url: 'https://custom.example.com',
        region: 'global',
        timeout: 60000,
        _: [],
        $0: 'freedom',
      }

      await startCommand.handler!(argv as any)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Profile: test-profile'),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Headless: Yes'),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('URL: https://custom.example.com'),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Region: global'),
      )
    })

    it('should display warning about unimplemented functionality', async () => {
      const argv = {
        profile: 'default',
        headless: false,
        url: 'https://ys.mihoyo.com/cloud/',
        region: 'cn',
        timeout: 30000,
        _: [],
        $0: 'freedom',
      }

      await startCommand.handler!(argv as any)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Game automation core not yet implemented'),
      )
    })

    it('should handle errors and throw GameAutomationError', async () => {
      // Mock console.log to throw an error
      mockConsoleLog.mockImplementationOnce(() => {
        throw new Error('Console error')
      })

      const argv = {
        profile: 'default',
        headless: false,
        url: 'https://ys.mihoyo.com/cloud/',
        region: 'cn',
        timeout: 30000,
        _: [],
        $0: 'freedom',
      }

      await expect(startCommand.handler!(argv as any)).rejects.toThrow(
        expect.objectContaining({
          name: 'GameAutomationError',
          message: expect.stringContaining('Failed to start game session'),
        }),
      )
    })

    it('should handle unknown errors', async () => {
      // Mock console.log to throw a non-Error object
      mockConsoleLog.mockImplementationOnce(() => {
        throw new Error('String error')
      })

      const argv = {
        profile: 'default',
        headless: false,
        url: 'https://ys.mihoyo.com/cloud/',
        region: 'cn',
        timeout: 30000,
        _: [],
        $0: 'freedom',
      }

      await expect(startCommand.handler!(argv as any)).rejects.toThrow(
        expect.objectContaining({
          name: 'GameAutomationError',
          message: 'Failed to start game session: Unknown error',
        }),
      )
    })
  })

  describe('configuration integration', () => {
    it('should use configuration values as defaults', () => {
      const mockYargs = {
        positional: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis(),
      }

      const builder = startCommand.builder as (yargs: any) => any
      builder(mockYargs)

      // Check that configuration values are used as defaults
      const headlessCall = mockYargs.option.mock.calls.find(
        call => call[0] === 'headless',
      )
      expect(headlessCall[1].default).toBe(false) // from mocked config

      const urlCall = mockYargs.option.mock.calls.find(
        call => call[0] === 'url',
      )
      expect(urlCall[1].default).toBe('https://ys.mihoyo.com/cloud/') // from mocked config
    })
  })

  describe('argument validation', () => {
    it('should validate region choices', () => {
      const mockYargs = {
        positional: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis(),
      }

      const builder = startCommand.builder as (yargs: any) => any
      builder(mockYargs)

      const regionCall = mockYargs.option.mock.calls.find(
        call => call[0] === 'region',
      )
      expect(regionCall[1].choices).toEqual(['cn', 'global'])
    })

    it('should have proper aliases for options', () => {
      const mockYargs = {
        positional: vi.fn().mockReturnThis(),
        option: vi.fn().mockReturnThis(),
      }

      const builder = startCommand.builder as (yargs: any) => any
      builder(mockYargs)

      const optionCalls = mockYargs.option.mock.calls
      const aliases = optionCalls.map(call => ({ option: call[0], alias: call[1].alias }))

      expect(aliases).toContainEqual({ option: 'headless', alias: 'h' })
      expect(aliases).toContainEqual({ option: 'url', alias: 'u' })
      expect(aliases).toContainEqual({ option: 'region', alias: 'r' })
      expect(aliases).toContainEqual({ option: 'timeout', alias: 't' })
    })
  })
})
