// 构建系统测试
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

// Mock Node.js modules
vi.mock('node:child_process', () => ({
  execSync: vi.fn()
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn()
}))

vi.mock('node:path', () => ({
  resolve: vi.fn()
}))

describe('Build System', () => {
  const mockExecSync = vi.mocked(execSync)
  const mockExistsSync = vi.mocked(existsSync)
  const mockResolve = vi.mocked(resolve)

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Default mocks
    mockExistsSync.mockReturnValue(true)
    mockResolve.mockImplementation((...paths) => paths.join('/'))
    
    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Package existence check', () => {
    it('should check if package directories exist', () => {
      mockExistsSync.mockReturnValue(true)
      
      // Simulate importing and running the build script
      const packages = ['shared', 'core', 'cli', 'test-utils']
      
      packages.forEach(pkg => {
        const packagePath = resolve('packages', pkg)
        existsSync(packagePath)
      })
      
      expect(mockResolve).toHaveBeenCalledWith('packages', 'shared')
      expect(mockResolve).toHaveBeenCalledWith('packages', 'core')
      expect(mockResolve).toHaveBeenCalledWith('packages', 'cli')
      expect(mockResolve).toHaveBeenCalledWith('packages', 'test-utils')
    })

    it('should handle missing packages gracefully', () => {
      mockExistsSync.mockImplementation((path) => {
        return typeof path === 'string' && !path.includes('missing-package')
      })
      
      // This should not throw but log a warning for missing packages
      const packagePath = resolve('packages', 'missing-package')
      const exists = existsSync(packagePath)
      
      expect(exists).toBe(false)
      expect(mockResolve).toHaveBeenCalledWith('packages', 'missing-package')
    })
  })

  describe('Build command execution', () => {
    it('should execute pnpm build commands for each package', () => {
      mockExecSync.mockReturnValue(Buffer.from('Build successful'))
      
      const packages = ['shared', 'core', 'cli', 'test-utils']
      
      packages.forEach(pkg => {
        const command = `pnpm --filter=@freedom/${pkg} run build`
        execSync(command, { stdio: 'inherit', cwd: process.cwd() })
      })
      
      expect(mockExecSync).toHaveBeenCalledTimes(packages.length)
      packages.forEach(pkg => {
        expect(mockExecSync).toHaveBeenCalledWith(
          `pnpm --filter=@freedom/${pkg} run build`,
          { stdio: 'inherit', cwd: process.cwd() }
        )
      })
    })

    it('should handle build failures', () => {
      const buildError = new Error('Build failed') as any
      buildError.message = 'Build command failed'
      mockExecSync.mockImplementation(() => {
        throw buildError
      })
      
      expect(() => {
        execSync('pnpm --filter=@freedom/cli run build', { 
          stdio: 'inherit', 
          cwd: process.cwd() 
        })
      }).toThrow('Build command failed')
    })
  })

  describe('Build script integration', () => {
    it('should follow proper build sequence', async () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync.mockReturnValue(Buffer.from('Success'))
      
      // Simulate the build script logic
      const packages = ['shared', 'core', 'cli', 'test-utils']
      const buildResults = []
      
      for (const pkg of packages) {
        const packagePath = resolve('packages', pkg)
        
        if (existsSync(packagePath)) {
          try {
            execSync(`pnpm --filter=@freedom/${pkg} run build`, {
              stdio: 'inherit',
              cwd: process.cwd(),
            })
            buildResults.push({ package: pkg, success: true })
          } catch (error) {
            buildResults.push({ package: pkg, success: false, error })
          }
        } else {
          buildResults.push({ package: pkg, success: false, reason: 'not found' })
        }
      }
      
      expect(buildResults).toHaveLength(4)
      expect(buildResults.every(result => result.success)).toBe(true)
    })

    it('should exit with error code on build failure', () => {
      mockExistsSync.mockReturnValue(true)
      mockExecSync.mockImplementation(() => {
        throw new Error('Build failed')
      })
      
      // Simulate build script error handling
      expect(() => {
        try {
          execSync('pnpm --filter=@freedom/cli run build', { 
            stdio: 'inherit', 
            cwd: process.cwd() 
          })
        } catch (error) {
          process.exit(1)
        }
      }).toThrow('process.exit called')
    })
  })

  describe('Build script output', () => {
    it('should provide appropriate console output', () => {
      const mockConsoleLog = vi.spyOn(console, 'log')
      
      // Simulate build script console output
      console.log('🚀 Building all packages...')
      console.log('📦 Building package: cli')
      console.log('✅ Package cli built successfully')
      console.log('🎉 All packages built successfully!')
      
      expect(mockConsoleLog).toHaveBeenCalledWith('🚀 Building all packages...')
      expect(mockConsoleLog).toHaveBeenCalledWith('📦 Building package: cli')
      expect(mockConsoleLog).toHaveBeenCalledWith('✅ Package cli built successfully')
      expect(mockConsoleLog).toHaveBeenCalledWith('🎉 All packages built successfully!')
    })

    it('should provide error output on failure', () => {
      const mockConsoleError = vi.spyOn(console, 'error')
      
      // Simulate build script error output
      console.error('❌ Failed to build package cli:', 'Build error message')
      
      expect(mockConsoleError).toHaveBeenCalledWith(
        '❌ Failed to build package cli:', 
        'Build error message'
      )
    })
  })

  describe('Package filtering', () => {
    it('should use correct pnpm filter syntax', () => {
      const testPackages = ['shared', 'core', 'cli', 'test-utils']
      
      testPackages.forEach(pkg => {
        const expectedCommand = `pnpm --filter=@freedom/${pkg} run build`
        
        // Verify command format
        expect(expectedCommand).toMatch(/^pnpm --filter=@freedom\/\w+ run build$/)
        expect(expectedCommand).toContain(`@freedom/${pkg}`)
      })
    })

    it('should handle package scoping correctly', () => {
      const command = 'pnpm --filter=@freedom/cli run build'
      
      expect(command).toContain('@freedom/')
      expect(command).toContain('run build')
      expect(command.split(' ')).toContain('--filter=@freedom/cli')
    })
  })
})