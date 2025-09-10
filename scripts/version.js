#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execSync } from 'node:child_process'

const version = process.argv[2]
if (!version) {
  console.error('❌ Version not provided. Usage: node scripts/version.js <version>')
  process.exit(1)
}

const packages = [
  'shared',
  'core', 
  'cli',
  'test-utils',
]

console.log(`🏷️  Updating version to ${version}...`)

// Update root package.json
const rootPackagePath = resolve('package.json')
const rootPackage = JSON.parse(readFileSync(rootPackagePath, 'utf8'))
rootPackage.version = version
writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2) + '\n')
console.log('✅ Updated root package.json')

// Update all workspace packages
for (const pkg of packages) {
  const packagePath = resolve('packages', pkg, 'package.json')
  
  try {
    const packageContent = JSON.parse(readFileSync(packagePath, 'utf8'))
    packageContent.version = version
    writeFileSync(packagePath, JSON.stringify(packageContent, null, 2) + '\n')
    console.log(`✅ Updated ${pkg} package.json`)
  } catch (error) {
    console.log(`⚠️  Package ${pkg} does not exist, skipping...`)
  }
}

// Commit and tag
try {
  execSync(`git add -A && git commit -m "chore: bump version to ${version}"`, { stdio: 'inherit' })
  execSync(`git tag -a v${version} -m "Release v${version}"`, { stdio: 'inherit' })
  console.log(`🎉 Version ${version} committed and tagged successfully!`)
} catch (error) {
  console.warn('⚠️  Git operations failed, but version files updated successfully')
}