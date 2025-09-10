#!/usr/bin/env node

import process from 'node:process'
// 全局入口点 - 包含错误处理和程序启动
import { main } from './main.js'
import { FatalError } from './utils/errors.js'

// 设置未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message)
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack)
  }
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// 主程序入口
main().catch((error) => {
  if (error instanceof FatalError) {
    // 处理已知的致命错误
    console.error(`❌ ${error.message}`)
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack)
    }
    process.exit(error.exitCode)
  }

  // 处理未知错误
  console.error('❌ An unexpected critical error occurred:')
  console.error(error.message)
  if (process.env.NODE_ENV === 'development') {
    console.error(error.stack)
  }
  process.exit(1)
})
