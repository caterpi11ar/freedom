import type { LogEntry } from '@freedom/logger'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import * as readline from 'node:readline'
import { Logger, LogLevel } from '@freedom/logger'
import { globalStateManager } from '@freedom/shared'
import { Command } from 'commander'

// 日志管理器
class LogManager {
  private logDir: string
  private logger: Logger

  constructor() {
    this.logDir = path.join(os.homedir(), '.freedom', 'logs')
    this.logger = new Logger({
      level: LogLevel.INFO,
      outputs: [
        {
          type: 'console',
          enabled: true,
        },
        {
          type: 'file',
          path: path.join(this.logDir, 'freedom.log'),
          enabled: true,
        },
      ],
      contextName: 'freedom',
      logRotation: true,
    })
  }

  async ensureLogDir(): Promise<void> {
    try {
      await fs.access(this.logDir)
    }
    catch {
      await fs.mkdir(this.logDir, { recursive: true })
    }
  }

  async getLogFiles(): Promise<string[]> {
    await this.ensureLogDir()
    try {
      const files = await fs.readdir(this.logDir)
      return files
        .filter(file => file.endsWith('.log') || file.includes('.log.'))
        .sort((a, b) => b.localeCompare(a))
    }
    catch {
      return []
    }
  }

  async readLogFile(filename: string, lines: number = 100): Promise<string[]> {
    const filePath = path.join(this.logDir, filename)
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const allLines = content.split('\n').filter(line => line.trim())
      return allLines.slice(-lines) // 返回最后N行
    }
    catch (error) {
      throw new Error(`无法读取日志文件: ${error}`)
    }
  }

  async searchLogs(pattern: string, filename?: string): Promise<{ file: string, line: string, lineNumber: number }[]> {
    const results: { file: string, line: string, lineNumber: number }[] = []
    const files = filename ? [filename] : await this.getLogFiles()

    for (const file of files) {
      try {
        const content = await fs.readFile(path.join(this.logDir, file), 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line, index) => {
          if (line.toLowerCase().includes(pattern.toLowerCase())) {
            results.push({
              file,
              line: line.trim(),
              lineNumber: index + 1,
            })
          }
        })
      }
      catch {
        // 忽略无法读取的文件
      }
    }

    return results
  }

  async getLogStats(): Promise<{
    totalFiles: number
    totalSize: number
    oldestLog: Date | null
    newestLog: Date | null
    levelCounts: Record<string, number>
  }> {
    await this.ensureLogDir()
    const files = await this.getLogFiles()
    let totalSize = 0
    let oldestLog: Date | null = null
    let newestLog: Date | null = null
    const levelCounts: Record<string, number> = {}

    for (const file of files) {
      try {
        const filePath = path.join(this.logDir, file)
        const stats = await fs.stat(filePath)
        totalSize += stats.size

        const fileDate = stats.mtime
        if (!oldestLog || fileDate < oldestLog) {
          oldestLog = fileDate
        }
        if (!newestLog || fileDate > newestLog) {
          newestLog = fileDate
        }

        // 简单统计日志级别
        const content = await fs.readFile(filePath, 'utf-8')
        const lines = content.split('\n')

        lines.forEach((line) => {
          if (line.includes('ERROR'))
            levelCounts.ERROR = (levelCounts.ERROR || 0) + 1
          else if (line.includes('WARN'))
            levelCounts.WARN = (levelCounts.WARN || 0) + 1
          else if (line.includes('INFO'))
            levelCounts.INFO = (levelCounts.INFO || 0) + 1
          else if (line.includes('DEBUG'))
            levelCounts.DEBUG = (levelCounts.DEBUG || 0) + 1
          else if (line.includes('TRACE'))
            levelCounts.TRACE = (levelCounts.TRACE || 0) + 1
        })
      }
      catch {
        // 忽略无法处理的文件
      }
    }

    return {
      totalFiles: files.length,
      totalSize,
      oldestLog,
      newestLog,
      levelCounts,
    }
  }

  async cleanupOldLogs(keepDays: number = 7): Promise<number> {
    await this.ensureLogDir()
    const files = await this.getLogFiles()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - keepDays)

    let deletedCount = 0

    for (const file of files) {
      try {
        const filePath = path.join(this.logDir, file)
        const stats = await fs.stat(filePath)

        if (stats.mtime < cutoffDate) {
          await fs.unlink(filePath)
          deletedCount++
        }
      }
      catch {
        // 忽略删除失败的文件
      }
    }

    return deletedCount
  }

  getLogger(): Logger {
    return this.logger
  }
}

const logManager = new LogManager()

export async function executeLogView(): Promise<void> {
  console.log('📖 查看日志文件')

  try {
    const files = await logManager.getLogFiles()

    if (files.length === 0) {
      console.log('💭 暂无日志文件')
      return
    }

    console.log('\n📁 可用的日志文件:')
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`)
    })

    const choice = await getInput(`\n请选择文件 (1-${files.length}): `)
    const index = Number.parseInt(choice) - 1

    if (index < 0 || index >= files.length) {
      console.log('❌ 无效选择')
      return
    }

    const filename = files[index]
    const linesInput = await getInput('显示行数 (默认100): ')
    const lines = linesInput ? Number.parseInt(linesInput) : 100

    console.log(`\n📄 显示 ${filename} 的最后 ${lines} 行:`)
    console.log('─'.repeat(80))

    const logLines = await logManager.readLogFile(filename, lines)
    logLines.forEach((line) => {
      // 简单的颜色处理
      if (line.includes('ERROR') || line.includes('FATAL')) {
        console.log(`\x1B[31m${line}\x1B[0m`) // 红色
      }
      else if (line.includes('WARN')) {
        console.log(`\x1B[33m${line}\x1B[0m`) // 黄色
      }
      else if (line.includes('INFO')) {
        console.log(`\x1B[32m${line}\x1B[0m`) // 绿色
      }
      else if (line.includes('DEBUG')) {
        console.log(`\x1B[36m${line}\x1B[0m`) // 青色
      }
      else {
        console.log(line)
      }
    })
  }
  catch (error) {
    console.error('❌ 查看日志失败:', error)
  }
}

export async function executeLogSearch(): Promise<void> {
  console.log('🔍 搜索日志内容')

  try {
    const pattern = await getInput('搜索关键词: ')
    if (!pattern.trim()) {
      console.log('❌ 搜索关键词不能为空')
      return
    }

    const files = await logManager.getLogFiles()
    if (files.length === 0) {
      console.log('💭 暂无日志文件可搜索')
      return
    }

    console.log('\n📁 选择搜索范围:')
    console.log('  0. 搜索所有文件')
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`)
    })

    const choice = await getInput(`\n请选择 (0-${files.length}): `)
    const index = Number.parseInt(choice)

    let filename: string | undefined
    if (index >= 1 && index <= files.length) {
      filename = files[index - 1]
    }
    else if (index !== 0) {
      console.log('❌ 无效选择')
      return
    }

    console.log('\n🔍 搜索中...')
    const results = await logManager.searchLogs(pattern, filename)

    if (results.length === 0) {
      console.log('💭 未找到匹配的日志条目')
      return
    }

    console.log(`\n📋 找到 ${results.length} 条匹配记录:`)
    console.log('─'.repeat(80))

    results.slice(0, 20).forEach((result, index) => {
      console.log(`\n${index + 1}. 📁 ${result.file}:${result.lineNumber}`)
      // 高亮显示匹配的关键词
      const highlightedLine = result.line.replace(
        new RegExp(pattern, 'gi'),
        `\x1B[43m\x1B[30m$&\x1B[0m`,
      )
      console.log(`   ${highlightedLine}`)
    })

    if (results.length > 20) {
      console.log(`\n... 还有 ${results.length - 20} 条记录`)
    }
  }
  catch (error) {
    console.error('❌ 搜索日志失败:', error)
  }
}

export async function executeLogStats(): Promise<void> {
  console.log('📊 日志统计信息')

  try {
    const stats = await logManager.getLogStats()

    console.log('\n📋 基本统计:')
    console.log(`  日志文件数: ${stats.totalFiles}`)
    console.log(`  总文件大小: ${formatFileSize(stats.totalSize)}`)

    if (stats.oldestLog) {
      console.log(`  最早日志: ${stats.oldestLog.toLocaleString()}`)
    }

    if (stats.newestLog) {
      console.log(`  最新日志: ${stats.newestLog.toLocaleString()}`)
    }

    if (Object.keys(stats.levelCounts).length > 0) {
      console.log('\n📈 日志级别统计:')
      Object.entries(stats.levelCounts)
        .sort(([, a], [, b]) => b - a)
        .forEach(([level, count]) => {
          const icon = {
            ERROR: '🔴',
            WARN: '🟡',
            INFO: '🟢',
            DEBUG: '🔵',
            TRACE: '⚪',
          }[level] || '❓'

          console.log(`  ${icon} ${level}: ${count} 条`)
        })
    }

    // 显示磁盘使用情况
    const logDir = path.join(os.homedir(), '.freedom', 'logs')
    console.log('\n💾 存储信息:')
    console.log(`  日志目录: ${logDir}`)
    console.log(`  文件数量: ${stats.totalFiles}`)
  }
  catch (error) {
    console.error('❌ 获取日志统计失败:', error)
  }
}

export async function executeLogCleanup(): Promise<void> {
  console.log('🧹 清理日志文件')

  try {
    const stats = await logManager.getLogStats()

    console.log('\n📊 当前状态:')
    console.log(`  日志文件数: ${stats.totalFiles}`)
    console.log(`  总文件大小: ${formatFileSize(stats.totalSize)}`)

    if (stats.totalFiles === 0) {
      console.log('💭 暂无日志文件需要清理')
      return
    }

    const keepDaysInput = await getInput('\n保留最近多少天的日志？(默认7天): ')
    const keepDays = keepDaysInput ? Number.parseInt(keepDaysInput) : 7

    if (Number.isNaN(keepDays) || keepDays < 1) {
      console.log('❌ 无效的天数')
      return
    }

    console.log(`⚠️  即将删除 ${keepDays} 天前的日志文件`)
    const confirm = await getInput('确认执行清理？(y/N): ')

    if (confirm.toLowerCase() !== 'y' && confirm.toLowerCase() !== 'yes') {
      console.log('❌ 清理已取消')
      return
    }

    console.log('🧹 清理中...')
    const deletedCount = await logManager.cleanupOldLogs(keepDays)

    if (deletedCount > 0) {
      console.log(`✅ 清理完成，删除了 ${deletedCount} 个日志文件`)

      // 显示清理后的状态
      const newStats = await logManager.getLogStats()
      console.log(`📊 清理后状态:`)
      console.log(`  剩余文件数: ${newStats.totalFiles}`)
      console.log(`  剩余大小: ${formatFileSize(newStats.totalSize)}`)
    }
    else {
      console.log('💭 没有需要清理的日志文件')
    }
  }
  catch (error) {
    console.error('❌ 清理日志失败:', error)
  }
}

export async function executeLogMonitor(): Promise<void> {
  console.log('📡 实时日志监控')
  console.log('💡 按 Ctrl+C 停止监控\n')

  const logger = logManager.getLogger()
  let lineCount = 0

  // 监听日志事件
  logger.on('log', (entry: LogEntry) => {
    lineCount++

    // 格式化输出
    const timestamp = entry.timestamp.toLocaleTimeString()
    const level = entry.level.toString().padEnd(5)
    const context = entry.context ? `[${entry.context}]` : ''

    // 根据级别设置颜色
    let color = '\x1B[37m' // 白色默认
    if (entry.level >= LogLevel.ERROR)
      color = '\x1B[31m' // 红色
    else if (entry.level >= LogLevel.WARN)
      color = '\x1B[33m' // 黄色
    else if (entry.level >= LogLevel.INFO)
      color = '\x1B[32m' // 绿色
    else if (entry.level >= LogLevel.DEBUG)
      color = '\x1B[36m' // 青色

    console.log(`${color}[${timestamp}] ${level} ${context} ${entry.message}\x1B[0m`)

    if (entry.error) {
      console.log(`\x1B[31m${entry.error.stack || entry.error.message}\x1B[0m`)
    }
  })

  // 模拟日志生成（实际使用中会是真实的日志）
  const demoInterval = setInterval(() => {
    const messages = [
      { level: LogLevel.INFO, message: '系统运行正常' },
      { level: LogLevel.DEBUG, message: '处理用户请求' },
      { level: LogLevel.WARN, message: '检测到性能波动' },
      { level: LogLevel.ERROR, message: '连接超时' },
    ]

    const randomMessage = messages[Math.floor(Math.random() * messages.length)]

    if (randomMessage.level === LogLevel.ERROR) {
      logger.error(randomMessage.message, new Error('模拟错误'))
    }
    else if (randomMessage.level === LogLevel.WARN) {
      logger.warn(randomMessage.message)
    }
    else if (randomMessage.level === LogLevel.DEBUG) {
      logger.debug(randomMessage.message)
    }
    else {
      logger.info(randomMessage.message)
    }
  }, 2000) // 每2秒生成一条日志

  // 处理退出信号
  process.on('SIGINT', () => {
    clearInterval(demoInterval)
    console.log(`\n\n📊 监控结束，共显示 ${lineCount} 条日志`)
    process.exit(0)
  })

  // 更新全局状态
  globalStateManager.updateLoggingState({
    isActive: true,
    recentErrors: 0,
    logLevel: 'INFO',
  })
}

export async function executeLogExport(): Promise<void> {
  console.log('📦 导出日志文件')

  try {
    const files = await logManager.getLogFiles()

    if (files.length === 0) {
      console.log('💭 暂无日志文件可导出')
      return
    }

    console.log('\n📁 选择要导出的文件:')
    console.log('  0. 导出所有日志文件')
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file}`)
    })

    const choice = await getInput(`\n请选择 (0-${files.length}): `)
    const index = Number.parseInt(choice)

    const exportPath = await getInput('导出路径 (默认当前目录): ') || '.'

    try {
      await fs.access(exportPath)
    }
    catch {
      console.log('❌ 导出路径不存在')
      return
    }

    if (index === 0) {
      // 导出所有文件
      console.log('📦 导出所有日志文件...')

      for (const file of files) {
        const sourcePath = path.join(os.homedir(), '.freedom', 'logs', file)
        const targetPath = path.join(exportPath, `freedom_${file}`)

        await fs.copyFile(sourcePath, targetPath)
        console.log(`✅ 已导出: ${file} -> ${targetPath}`)
      }

      console.log(`🎉 成功导出 ${files.length} 个日志文件到 ${exportPath}`)
    }
    else if (index >= 1 && index <= files.length) {
      // 导出单个文件
      const file = files[index - 1]
      const sourcePath = path.join(os.homedir(), '.freedom', 'logs', file)
      const targetPath = path.join(exportPath, `freedom_${file}`)

      await fs.copyFile(sourcePath, targetPath)
      console.log(`✅ 已导出: ${file} -> ${targetPath}`)
    }
    else {
      console.log('❌ 无效选择')
    }
  }
  catch (error) {
    console.error('❌ 导出日志失败:', error)
  }
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB']
  if (bytes === 0)
    return '0 B'

  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  const size = (bytes / 1024 ** i).toFixed(1)

  return `${size} ${sizes[i]}`
}

// 创建日志管理命令
export const logCommand = new Command('log')
  .description('日志管理')

logCommand
  .command('view')
  .alias('show')
  .description('查看日志文件')
  .action(executeLogView)

logCommand
  .command('search')
  .alias('find')
  .description('搜索日志内容')
  .action(executeLogSearch)

logCommand
  .command('stats')
  .description('显示日志统计')
  .action(executeLogStats)

logCommand
  .command('cleanup')
  .alias('clean')
  .description('清理日志文件')
  .action(executeLogCleanup)

logCommand
  .command('monitor')
  .alias('tail')
  .description('实时监控日志')
  .action(executeLogMonitor)

logCommand
  .command('export')
  .description('导出日志文件')
  .action(executeLogExport)

// 简单输入获取函数
async function getInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(prompt, (answer: string) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}
