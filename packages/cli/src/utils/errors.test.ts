// 错误处理系统测试
import { describe, expect, it } from 'vitest'
import {
  ConfigurationError,
  FatalError,
  formatError,
  FreedomError,
  GameAutomationError,
  isUserError,
  ValidationError,
} from './errors.js'

describe('error Handling System', () => {
  describe('freedomError', () => {
    it('should create a basic FreedomError with message and code', () => {
      const error = new FreedomError('Test message', 'TEST_CODE')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(FreedomError)
      expect(error.name).toBe('FreedomError')
      expect(error.message).toBe('Test message')
      expect(error.code).toBe('TEST_CODE')
      expect(error.exitCode).toBe(1) // default exit code
    })

    it('should create a FreedomError with custom exit code', () => {
      const error = new FreedomError('Test message', 'TEST_CODE', 42)

      expect(error.exitCode).toBe(42)
    })

    it('should have proper stack trace', () => {
      const error = new FreedomError('Test message', 'TEST_CODE')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('FreedomError')
    })
  })

  describe('fatalError', () => {
    it('should create a FatalError with default code', () => {
      const error = new FatalError('Fatal test message')

      expect(error).toBeInstanceOf(FreedomError)
      expect(error).toBeInstanceOf(FatalError)
      expect(error.name).toBe('FatalError')
      expect(error.message).toBe('Fatal test message')
      expect(error.code).toBe('FATAL_ERROR')
      expect(error.exitCode).toBe(1)
    })

    it('should create a FatalError with custom code', () => {
      const error = new FatalError('Fatal test message', 'CUSTOM_FATAL')

      expect(error.code).toBe('CUSTOM_FATAL')
    })
  })

  describe('configurationError', () => {
    it('should create a ConfigurationError with proper exit code', () => {
      const error = new ConfigurationError('Config test message')

      expect(error).toBeInstanceOf(FreedomError)
      expect(error).toBeInstanceOf(ConfigurationError)
      expect(error.name).toBe('ConfigurationError')
      expect(error.message).toBe('Config test message')
      expect(error.code).toBe('CONFIGURATION_ERROR')
      expect(error.exitCode).toBe(78) // EX_CONFIG from sysexits.h
    })
  })

  describe('gameAutomationError', () => {
    it('should create a GameAutomationError with default code', () => {
      const error = new GameAutomationError('Game automation test message')

      expect(error).toBeInstanceOf(FreedomError)
      expect(error).toBeInstanceOf(GameAutomationError)
      expect(error.name).toBe('GameAutomationError')
      expect(error.message).toBe('Game automation test message')
      expect(error.code).toBe('AUTOMATION_ERROR')
      expect(error.exitCode).toBe(1)
    })

    it('should create a GameAutomationError with custom code', () => {
      const error = new GameAutomationError('Game automation test message', 'GAME_TIMEOUT')

      expect(error.code).toBe('GAME_TIMEOUT')
    })
  })

  describe('validationError', () => {
    it('should create a ValidationError with proper exit code', () => {
      const error = new ValidationError('Validation test message')

      expect(error).toBeInstanceOf(FreedomError)
      expect(error).toBeInstanceOf(ValidationError)
      expect(error.name).toBe('ValidationError')
      expect(error.message).toBe('Validation test message')
      expect(error.code).toBe('VALIDATION_ERROR')
      expect(error.exitCode).toBe(64) // EX_USAGE from sysexits.h
    })
  })

  describe('formatError', () => {
    it('should format FreedomError with code and message', () => {
      const error = new FreedomError('Test message', 'TEST_CODE')
      const formatted = formatError(error)

      expect(formatted).toBe('[TEST_CODE] Test message')
    })

    it('should format regular Error without code', () => {
      const error = new Error('Regular error message')
      const formatted = formatError(error)

      expect(formatted).toBe('Regular error message')
    })

    it('should handle nested FreedomError subclasses', () => {
      const error = new ConfigurationError('Config error')
      const formatted = formatError(error)

      expect(formatted).toBe('[CONFIGURATION_ERROR] Config error')
    })
  })

  describe('isUserError', () => {
    it('should return true for FreedomError instances', () => {
      const error = new FreedomError('Test message', 'TEST_CODE')

      expect(isUserError(error)).toBe(true)
    })

    it('should return true for FreedomError subclasses', () => {
      const fatalError = new FatalError('Fatal message')
      const configError = new ConfigurationError('Config message')
      const gameError = new GameAutomationError('Game message')
      const validationError = new ValidationError('Validation message')

      expect(isUserError(fatalError)).toBe(true)
      expect(isUserError(configError)).toBe(true)
      expect(isUserError(gameError)).toBe(true)
      expect(isUserError(validationError)).toBe(true)
    })

    it('should return false for regular Error instances', () => {
      const error = new Error('Regular error')

      expect(isUserError(error)).toBe(false)
    })

    it('should return false for other error types', () => {
      const typeError = new TypeError('Type error')
      const syntaxError = new SyntaxError('Syntax error')

      expect(isUserError(typeError)).toBe(false)
      expect(isUserError(syntaxError)).toBe(false)
    })
  })

  describe('error inheritance chain', () => {
    it('should maintain proper inheritance hierarchy', () => {
      const fatalError = new FatalError('Test')

      expect(fatalError instanceof Error).toBe(true)
      expect(fatalError instanceof FreedomError).toBe(true)
      expect(fatalError instanceof FatalError).toBe(true)
    })

    it('should not be instance of sibling classes', () => {
      const fatalError = new FatalError('Test')

      expect(fatalError instanceof ConfigurationError).toBe(false)
      expect(fatalError instanceof GameAutomationError).toBe(false)
      expect(fatalError instanceof ValidationError).toBe(false)
    })
  })
})
