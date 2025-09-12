import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
// 测试工具函数 - 参照 Gemini-CLI test-utils 架构
import { vi } from 'vitest'

export interface FileSystemStructure {
  [name: string]:
    | string
    | FileSystemStructure
    | Array<string | FileSystemStructure>
}

export class TestUtilities {
  private tempDirs: string[] = []

  /**
   * 创建临时目录结构
   */
  createTempDirectory(structure?: FileSystemStructure): string {
    const tempPath = join(tmpdir(), `freedom-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`)
    this.tempDirs.push(tempPath)

    if (structure) {
      this.createStructure(tempPath, structure)
    }

    return tempPath
  }

  /**
   * 创建文件系统结构
   */
  private createStructure(basePath: string, structure: FileSystemStructure): void {
    if (!existsSync(basePath)) {
      mkdirSync(basePath, { recursive: true })
    }

    for (const [name, content] of Object.entries(structure)) {
      const fullPath = join(basePath, name)

      if (typeof content === 'string') {
        // 创建文件
        const dir = dirname(fullPath)
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true })
        }
        writeFileSync(fullPath, content, 'utf-8')
      }
      else if (Array.isArray(content)) {
        // 处理数组（暂时简化处理）
        mkdirSync(fullPath, { recursive: true })
      }
      else {
        // 创建目录和子结构
        mkdirSync(fullPath, { recursive: true })
        this.createStructure(fullPath, content)
      }
    }
  }

  /**
   * 清理所有临时目录
   */
  cleanupTempDirectories(): void {
    for (const tempDir of this.tempDirs) {
      try {
        if (existsSync(tempDir)) {
          rmSync(tempDir, { recursive: true, force: true })
        }
      }
      catch (error) {
        console.warn(`Failed to cleanup temp directory ${tempDir}:`, error)
      }
    }
    this.tempDirs = []
  }

  /**
   * 创建模拟配置
   */
  static createMockConfig(overrides: Record<string, any> = {}) {
    return {
      game: {
        url: 'https://test.example.com/',
        region: 'cn',
        language: 'zh-CN',
        autoLogin: false,
        ...overrides.game,
      },
      automation: {
        headless: true,
        slowMo: 0,
        timeout: 5000,
        retryAttempts: 1,
        enableScreenshots: false,
        screenshotPath: '/tmp/test',
        ...overrides.automation,
      },
      cli: {
        theme: 'dark',
        verbosity: 'quiet',
        interactive: false,
        autoUpdate: false,
        locale: 'en-US',
        ...overrides.cli,
      },
      extensions: {
        enabled: [],
        disabled: [],
        autoInstall: false,
        updateCheck: false,
        ...overrides.extensions,
      },
      logging: {
        level: 'error',
        maxSize: '1MB',
        maxFiles: 1,
        enableConsole: false,
        ...overrides.logging,
      },
      security: {
        enableTelemetry: false,
        allowRemoteControl: false,
        trustedDomains: ['test.example.com'],
        ...overrides.security,
      },
    }
  }

  /**
   * 设置测试环境
   */
  static setupTestEnvironment(): void {
    process.env.NODE_ENV = 'test'
    process.env.VITEST_SILENT = 'true'

    // Mock console methods to reduce noise
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'info').mockImplementation(() => {})
  }

  /**
   * 等待指定时间
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 创建模拟的yargs构建器
   */
  static createMockYargsBuilder() {
    return {
      positional: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      command: vi.fn().mockReturnThis(),
      demandCommand: vi.fn().mockReturnThis(),
      help: vi.fn().mockReturnThis(),
      wrap: vi.fn().mockReturnThis(),
      strict: vi.fn().mockReturnThis(),
      recommendCommands: vi.fn().mockReturnThis(),
      fail: vi.fn().mockReturnThis(),
    }
  }

  /**
   * 验证命令模块结构
   */
  static validateCommandModule(command: Record<string, any>): boolean {
    return (
      typeof command === 'object'
      && typeof command.command === 'string'
      && typeof command.describe === 'string'
      && typeof command.builder === 'function'
      && typeof command.handler === 'function'
    )
  }

  /**
   * 创建测试用的错误实例
   */
  static createTestError(message: string, type: 'Error' | 'TypeError' | 'SyntaxError' = 'Error'): Error {
    switch (type) {
      case 'TypeError':
        return new TypeError(message)
      case 'SyntaxError':
        return new SyntaxError(message)
      default:
        return new Error(message)
    }
  }
}
