#!/usr/bin/env node
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const packages = [
  'shared',
  'core',
  'cli',
  'test-utils',
]

console.log('🚀 Building all packages...')

for (const pkg of packages) {
  const packagePath = resolve('packages', pkg)

  if (!existsSync(packagePath)) {
    console.log(`⚠️  Package ${pkg} does not exist, skipping...`)
    continue
  }

  console.log(`📦 Building package: ${pkg}`)

  try {
    execSync(`pnpm --filter=@freedom/${pkg} run build`, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    console.log(`✅ Package ${pkg} built successfully`)
  }
  catch (error) {
    console.error(`❌ Failed to build package ${pkg}:`, error.message)
    process.exit(1)
  }
}

console.log('🎉 All packages built successfully!')
