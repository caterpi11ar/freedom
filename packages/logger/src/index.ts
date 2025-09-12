import type { LoggerConfig } from './Logger'
import { LogLevel } from './Logger'
import { LoggerManager } from './LoggerManager'

export { type LogEntry, type LogFilter, type LogFormatter, Logger, type LoggerConfig, LogLevel, type LogOutput } from './Logger'
export { type LoggerContext, LoggerManager, type LoggerManagerConfig } from './LoggerManager'

// 创建默认的全局Logger管理器
export const loggerManager = new LoggerManager({
  defaultLevel: LogLevel.INFO,
  logDirectory: './logs',
  defaultOutputs: [
    {
      type: 'console',
      enabled: true,
    },
    {
      type: 'file',
      enabled: true,
    },
  ],
})

// 便捷的全局Logger实例
export const globalLogger = loggerManager.getGlobalLogger()

// 便捷方法
export const getLogger = (name: string, config?: Partial<LoggerConfig>) => loggerManager.getLogger(name, config)
export const setLogLevel = (level: LogLevel, loggerNames?: string[]) => loggerManager.setLogLevel(level, loggerNames)
export const setConsoleOutput = (enabled: boolean, loggerNames?: string[]) => loggerManager.setConsoleOutput(enabled, loggerNames)
