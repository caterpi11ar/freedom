// 分层错误处理机制

export class FreedomError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number = 1,
  ) {
    super(message)
    this.name = 'FreedomError'
    Error.captureStackTrace(this, this.constructor)
  }
}

export class FatalError extends FreedomError {
  constructor(message: string, code: string = 'FATAL_ERROR') {
    super(message, code, 1)
    this.name = 'FatalError'
  }
}

export class ConfigurationError extends FreedomError {
  constructor(message: string) {
    super(message, 'CONFIGURATION_ERROR', 78) // EX_CONFIG from sysexits.h
    this.name = 'ConfigurationError'
  }
}

export class GameAutomationError extends FreedomError {
  constructor(message: string, code: string = 'AUTOMATION_ERROR') {
    super(message, code, 1)
    this.name = 'GameAutomationError'
  }
}

export class ValidationError extends FreedomError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 64) // EX_USAGE from sysexits.h
    this.name = 'ValidationError'
  }
}

// 错误格式化工具
export function formatError(error: Error): string {
  if (error instanceof FreedomError) {
    return `[${error.code}] ${error.message}`
  }
  return error.message
}

// 是否为用户错误（可展示给用户的错误）
export function isUserError(error: Error): boolean {
  return error instanceof FreedomError
}
