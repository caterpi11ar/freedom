#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import process from 'node:process'

console.log('📦 Creating executable bundle...')

// 确保bundle目录存在
if (!existsSync('bundle')) {
  mkdirSync('bundle', { recursive: true })
}

try {
  // 首先构建所有包
  console.log('🔨 Building packages first...')
  execSync('node scripts/build.js', { stdio: 'inherit' })

  // 然后创建bundle
  console.log('📦 Creating bundle...')
  execSync('node esbuild.config.js', { stdio: 'inherit' })

  // 设置执行权限 (Unix系统)
  if (process.platform !== 'win32') {
    execSync('chmod +x bundle/freedom.js', { stdio: 'inherit' })
  }

  console.log('✅ Bundle created successfully!')
  console.log('🎯 You can now run: ./bundle/freedom.js')
}
catch (error) {
  console.error('❌ Bundle creation failed:', error.message)
  process.exit(1)
}
