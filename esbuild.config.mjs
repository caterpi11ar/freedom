import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// 读取package.json获取版本信息
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))

const isWatch = process.argv.includes('--watch')
const isDev = process.env.NODE_ENV === 'development'

const config = {
  entryPoints: ['packages/cli/src/index.ts'],
  bundle: true,
  outfile: 'bundle/freedom.js',
  platform: 'node',
  target: 'node18',
  format: 'esm',
  external: [
    'playwright',
    'playwright-core',
    'esbuild',
    // Node.js built-ins
    'node:*',
    // 保持大型可选依赖为外部
  ],
  define: {
    'process.env.CLI_VERSION': JSON.stringify(pkg.version || '0.1.0'),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    'process.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
  },
  banner: {
    js: [
      '#!/usr/bin/env node',
      '// Freedom CLI - Canvas Game Automation Tool',
      `// Version: ${pkg.version || '0.1.0'}`,
      `// Build: ${new Date().toISOString()}`,
      'import { createRequire } from "module";',
      'const require = createRequire(import.meta.url);',
    ].join('\n'),
  },
  // 性能优化选项
  treeShaking: true,
  splitting: false, // Node.js单文件不需要代码分割
  sourcemap: isDev ? 'linked' : false,
  minify: !isDev,
  minifyWhitespace: !isDev,
  minifyIdentifiers: !isDev,
  minifySyntax: !isDev,
  keepNames: isDev, // 开发模式保持函数名以便调试
  
  // 优化导入解析
  resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  mainFields: ['module', 'main'],
  conditions: ['import', 'module', 'default'],
  
  // 输出配置
  outExtension: { '.js': '.js' },
  allowOverwrite: true,
  
  // 构建元数据
  metafile: !isWatch,
  
  // 监听模式优化
  ...(isWatch && {
    watch: {
      onRebuild(error, result) {
        const timestamp = new Date().toLocaleTimeString()
        if (error) {
          console.error(`[${timestamp}] ❌ Watch build failed:`, error)
        } else {
          console.log(`[${timestamp}] ✅ Watch build succeeded`)
          if (result?.metafile) {
            const size = Object.values(result.metafile.outputs)[0]?.bytes
            if (size) {
              console.log(`   📦 Bundle size: ${(size / 1024).toFixed(1)}KB`)
            }
          }
        }
      },
    },
  }),
}

try {
  const startTime = Date.now()
  const result = await build(config)
  const buildTime = Date.now() - startTime
  
  console.log('✅ Build completed successfully!')
  console.log(`📦 Output: ${config.outfile}`)
  console.log(`🎯 Target: ${config.target}`)
  console.log(`📊 Mode: ${isDev ? 'development' : 'production'}`)
  console.log(`⏱️  Build time: ${buildTime}ms`)
  
  // 分析构建结果
  if (result.metafile) {
    const outputs = result.metafile.outputs
    const mainOutput = outputs[config.outfile]
    
    if (mainOutput) {
      const sizeKB = (mainOutput.bytes / 1024).toFixed(1)
      console.log(`📏 Bundle size: ${sizeKB}KB`)
      
      // 分析最大的依赖
      const inputs = Object.entries(mainOutput.inputs || {})
        .sort(([,a], [,b]) => b.bytesInOutput - a.bytesInOutput)
        .slice(0, 5)
      
      if (inputs.length > 0) {
        console.log('📊 Top dependencies by size:')
        inputs.forEach(([path, info], i) => {
          const pathShort = path.length > 50 ? '...' + path.slice(-47) : path
          const sizeKB = (info.bytesInOutput / 1024).toFixed(1)
          console.log(`   ${i + 1}. ${pathShort} (${sizeKB}KB)`)
        })
      }
    }
    
    // 警告大文件
    if (mainOutput.bytes > 500 * 1024) { // 500KB
      console.log(`⚠️  Warning: Bundle size is large (${(mainOutput.bytes / 1024).toFixed(1)}KB)`)
      console.log('   Consider excluding more external dependencies or using lazy loading')
    }
    
    // 保存元数据用于分析
    if (!isWatch) {
      const { writeFileSync } = await import('node:fs')
      writeFileSync('bundle/metafile.json', JSON.stringify(result.metafile, null, 2))
      console.log('📋 Build analysis saved to bundle/metafile.json')
    }
  }
  
  // 性能建议
  if (!isDev && buildTime > 10000) { // 10秒
    console.log('💡 Build performance tips:')
    console.log('   - Enable incremental builds with --watch during development')
    console.log('   - Consider excluding more external dependencies')
    console.log('   - Use esbuild plugins for heavy transformations')
  }
  
  if (!isWatch) {
    console.log('🎉 Production build ready for distribution!')
  }
}
catch (error) {
  console.error('❌ Build failed:', error)
  
  // 提供具体的错误修复建议
  if (error.message?.includes('Cannot resolve')) {
    console.log('💡 Resolution error tips:')
    console.log('   - Check if the import path is correct')
    console.log('   - Ensure the dependency is installed')
    console.log('   - Add to external array if it should remain external')
  }
  
  if (error.message?.includes('Transform')) {
    console.log('💡 Transform error tips:')
    console.log('   - Check TypeScript syntax and types')
    console.log('   - Ensure target compatibility')
    console.log('   - Update esbuild to latest version')
  }
  
  process.exit(1)
}
