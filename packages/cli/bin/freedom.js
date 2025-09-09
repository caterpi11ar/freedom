#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const packageRoot = join(__dirname, '..')
const entryFile = join(packageRoot, 'src', 'index.ts')

// Use tsx directly from node_modules
const tsxBin = process.platform === 'win32' ? 'tsx.cmd' : 'tsx'
const tsxPath = join(packageRoot, 'node_modules', '.bin', tsxBin)

const child = spawn(tsxPath, [entryFile, ...process.argv.slice(2)], {
  stdio: 'inherit',
  cwd: packageRoot,
  shell: process.platform === 'win32',
})

child.on('exit', (code) => {
  process.exit(code || 0)
})
