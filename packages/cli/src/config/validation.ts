// 配置验证逻辑
import type { ConfigValidationError, FreedomConfig } from './schema.js'

export class ConfigValidator {
  private errors: ConfigValidationError[] = []

  validate(config: Partial<FreedomConfig>): ConfigValidationError[] {
    this.errors = []

    if (config.game) {
      this.validateGame(config.game)
    }

    if (config.automation) {
      this.validateAutomation(config.automation)
    }

    if (config.cli) {
      this.validateCli(config.cli)
    }

    if (config.logging) {
      this.validateLogging(config.logging)
    }

    if (config.security) {
      this.validateSecurity(config.security)
    }

    return this.errors
  }

  private validateGame(game: Partial<FreedomConfig['game']>): void {
    if (game.url && !this.isValidUrl(game.url)) {
      this.addError('game.url', 'Invalid URL format', game.url)
    }

    if (game.region && !['cn', 'global'].includes(game.region)) {
      this.addError('game.region', 'Region must be "cn" or "global"', game.region)
    }

    if (game.language && typeof game.language !== 'string') {
      this.addError('game.language', 'Language must be a string', game.language)
    }
  }

  private validateAutomation(automation: Partial<FreedomConfig['automation']>): void {
    if (automation.slowMo !== undefined && (automation.slowMo < 0 || automation.slowMo > 5000)) {
      this.addError('automation.slowMo', 'slowMo must be between 0 and 5000ms', automation.slowMo)
    }

    if (automation.timeout !== undefined && (automation.timeout < 1000 || automation.timeout > 300000)) {
      this.addError('automation.timeout', 'timeout must be between 1000ms and 300000ms', automation.timeout)
    }

    if (automation.retryAttempts !== undefined && (automation.retryAttempts < 0 || automation.retryAttempts > 10)) {
      this.addError('automation.retryAttempts', 'retryAttempts must be between 0 and 10', automation.retryAttempts)
    }
  }

  private validateCli(cli: Partial<FreedomConfig['cli']>): void {
    if (cli.theme && !['dark', 'light', 'auto'].includes(cli.theme)) {
      this.addError('cli.theme', 'theme must be "dark", "light", or "auto"', cli.theme)
    }

    if (cli.verbosity && !['quiet', 'normal', 'verbose', 'debug'].includes(cli.verbosity)) {
      this.addError('cli.verbosity', 'verbosity must be "quiet", "normal", "verbose", or "debug"', cli.verbosity)
    }
  }

  private validateLogging(logging: Partial<FreedomConfig['logging']>): void {
    if (logging.level && !['error', 'warn', 'info', 'debug'].includes(logging.level)) {
      this.addError('logging.level', 'level must be "error", "warn", "info", or "debug"', logging.level)
    }

    if (logging.maxSize && !this.isValidSize(logging.maxSize)) {
      this.addError('logging.maxSize', 'maxSize must be a valid size string (e.g., "10MB")', logging.maxSize)
    }

    if (logging.maxFiles !== undefined && (logging.maxFiles < 1 || logging.maxFiles > 100)) {
      this.addError('logging.maxFiles', 'maxFiles must be between 1 and 100', logging.maxFiles)
    }
  }

  private validateSecurity(security: Partial<FreedomConfig['security']>): void {
    if (security.trustedDomains) {
      for (const domain of security.trustedDomains) {
        if (!this.isValidDomain(domain)) {
          this.addError('security.trustedDomains', `Invalid domain: ${domain}`, domain)
        }
      }
    }
  }

  private addError(path: string, message: string, value?: unknown): void {
    this.errors.push({ path, message, value })
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    }
    catch {
      return false
    }
  }

  private isValidSize(size: string): boolean {
    return /^\d+(?:\.\d+)?[KMGT]?B$/i.test(size)
  }

  private isValidDomain(domain: string): boolean {
    // 基本域名验证
    return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i.test(domain)
  }
}

export function validateConfig(config: Partial<FreedomConfig>): ConfigValidationError[] {
  const validator = new ConfigValidator()
  return validator.validate(config)
}
