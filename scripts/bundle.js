#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
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
  execSync('node esbuild.config.mjs', { stdio: 'inherit' })

  // 添加shebang到文件开头
  console.log('🔧 Adding shebang...')
  const bundleFile = 'bundle/freedom.cjs'
  let content = readFileSync(bundleFile, 'utf8')
  
  // 检查是否已有shebang，如果没有则添加
  if (!content.startsWith('#!/usr/bin/env node')) {
    content = `#!/usr/bin/env node\n${content}`
    writeFileSync(bundleFile, content)
  }

  // 设置执行权限 (Unix系统)
  if (process.platform !== 'win32') {
    execSync('chmod +x bundle/freedom.cjs', { stdio: 'inherit' })
  }

  console.log('✅ Bundle created successfully!')
  console.log('🎯 You can now run: ./bundle/freedom.cjs')
}
catch (error) {
  console.error('❌ Bundle creation failed:', error.message)
  process.exit(1)
}
