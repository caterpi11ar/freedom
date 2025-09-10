# Freedom CLI 开发者指南

本指南面向希望为 Freedom 项目贡献代码、开发扩展或理解项目架构的开发者。

## 🏗️ 项目架构

### Monorepo 结构

Freedom 采用 pnpm workspace 的 monorepo 架构：

```
freedom/
├── packages/
│   ├── cli/           # CLI 命令行界面
│   ├── core/          # 核心游戏自动化逻辑
│   ├── shared/        # 共享类型和工具
│   ├── executor/      # 脚本执行引擎
│   ├── logger/        # 日志系统
│   ├── storage/       # 数据持久化
│   ├── webhook/       # Webhook 功能
│   └── test-utils/    # 测试工具
├── scripts/           # 构建和工具脚本
├── docs/             # 文档
├── extensions/       # 默认扩展
└── bundle/           # 构建输出
```

### 核心包说明

#### @freedom/cli
- **职责**: 命令行界面和用户交互
- **技术栈**: yargs, chalk, readline
- **入口**: `packages/cli/src/index.ts`

#### @freedom/core  
- **职责**: 浏览器自动化和游戏控制
- **技术栈**: Playwright
- **主要模块**:
  - `CanvasController`: 画布操作控制器
  - `LoginAutomator`: 登录自动化
  - `GameStateManager`: 游戏状态管理

#### @freedom/shared
- **职责**: 全局状态管理和类型定义
- **主要模块**:
  - 全局状态 EventEmitter
  - TypeScript 类型定义
  - 配置schema

## 🛠️ 开发环境设置

### 1. 环境准备

```bash
# Node.js 版本管理
nvm use 18  # 或更高版本

# 安装 pnpm
npm install -g pnpm@latest

# 克隆仓库
git clone https://github.com/caterpi11ar/freedom.git
cd freedom

# 安装依赖
pnpm install
```

### 2. 开发工具配置

推荐的 VS Code 扩展：
- TypeScript Hero
- ESLint
- Prettier
- Auto Import - ES6, TS, JSX, TSX
- Path Intellisense

推荐的 VS Code 设置 (`.vscode/settings.json`):
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

### 3. 开发脚本

```bash
# 开发模式 - 启动 CLI
pnpm dev

# 开发模式 - 所有包并行
pnpm dev:all  

# 类型检查
pnpm typecheck

# 代码规范检查
pnpm lint
pnpm lint:fix

# 测试
pnpm test
pnpm test:ci

# 构建
pnpm build

# 质量检查
pnpm quality
```

## 🎯 核心概念

### 1. 命令系统

Freedom 使用 yargs 构建模块化命令系统：

```typescript
// packages/cli/src/commands/example/hello.ts
import type { CommandModule } from 'yargs'

export const helloCommand: CommandModule = {
  command: 'hello <name>',
  describe: 'Say hello to someone',
  builder: yargs => 
    yargs.positional('name', {
      describe: 'Name to greet',
      type: 'string',
      demandOption: true,
    }),
  handler: async (argv) => {
    console.log(`Hello, ${argv.name}!`)
  },
}
```

### 2. 状态管理

使用全局 EventEmitter 进行状态管理：

```typescript
// packages/shared/src/store/index.ts
import { EventEmitter } from 'node:events'

export const globalStore = new EventEmitter()

// 发射状态变化
globalStore.emit('game:status:changed', { status: 'connected' })

// 监听状态变化
globalStore.on('game:status:changed', (data) => {
  console.log('Game status:', data.status)
})
```

### 3. 配置系统

多层配置系统支持：

```typescript
// packages/shared/src/types/config.ts
export interface FreedomConfig {
  game: {
    url: string
    region: 'asia' | 'america' | 'europe' | 'sar'
    headless: boolean
  }
  automation: {
    timeout: number
    retry: {
      count: number
      delay: number
    }
  }
  // ... 更多配置
}
```

### 4. 扩展系统

动态扩展加载机制：

```typescript
// packages/cli/src/extensions/ExtensionLoader.ts
export class ExtensionLoader {
  async loadExtension(path: string): Promise<LoadedExtension> {
    const manifest = await this.loadManifest(path)
    const module = await import(manifest.main)
    
    return {
      manifest,
      module,
      enabled: false,
      loaded: true,
    }
  }
}
```

## 🧩 扩展开发

### 1. 创建扩展

使用 CLI 脚手架创建扩展：

```bash
freedom> /extension create my-extension --typescript
```

这将创建以下结构：
```
extensions/my-extension/
├── package.json      # 扩展清单
├── src/
│   └── index.ts     # 主入口文件
├── tsconfig.json    # TypeScript 配置
└── README.md        # 说明文档
```

### 2. 扩展清单

`package.json` 扩展字段：

```json
{
  "name": "my-extension",
  "version": "1.0.0",
  "description": "My awesome extension",
  "main": "dist/index.js",
  "freedomVersion": "^0.1.0",
  "permissions": [
    "config.read",
    "logger.write", 
    "game.control"
  ],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

### 3. 扩展生命周期

```typescript
// extensions/my-extension/src/index.ts
import type { ExtensionContext } from '@freedom/shared'

export async function onEnable(context: ExtensionContext): Promise<void> {
  context.logger.info('Extension enabled')
  
  // 注册命令
  if (context.api.registerCommand) {
    context.api.registerCommand('my-extension:hello', handleHello)
  }
  
  // 注册事件钩子
  if (context.api.registerHook) {
    context.api.registerHook('game:login:success', onLoginSuccess)
  }
}

export async function onDisable(context: ExtensionContext): Promise<void> {
  context.logger.info('Extension disabled')
  // 清理资源
}

export async function onUnload(context: ExtensionContext): Promise<void> {
  context.logger.info('Extension unloaded')
  // 最终清理
}

async function handleHello(): Promise<void> {
  console.log('Hello from my extension!')
}

async function onLoginSuccess(data: any): Promise<void> {
  console.log('Login successful:', data)
}
```

### 4. 扩展 API

可用的 API 接口：

```typescript
interface ExtensionContext {
  // 配置访问
  config: FreedomConfig
  
  // 日志接口
  logger: {
    info(message: string): void
    warn(message: string): void  
    error(message: string): void
  }
  
  // 功能 API
  api: {
    // 注册命令
    registerCommand?(name: string, handler: Function): void
    
    // 注册事件钩子
    registerHook?(event: string, handler: Function): void
    
    // 游戏控制 (需要权限)
    gameController?: GameController
    
    // 存储接口
    storage?: StorageManager
  }
}
```

## 🧪 测试开发

### 1. 测试结构

```
packages/*/
├── src/
│   ├── __tests__/     # 单元测试
│   └── *.test.ts      # 组件测试
└── tests/
    ├── integration/   # 集成测试
    └── e2e/          # 端到端测试
```

### 2. 测试工具

使用 Vitest 作为测试框架：

```typescript
// packages/cli/src/commands/__tests__/config.test.ts
import { describe, it, expect, vi } from 'vitest'
import { getConfigValue } from '../config/get.js'

describe('Config Commands', () => {
  it('should get config value', async () => {
    const mockConfig = { game: { url: 'test-url' } }
    vi.mocked(getAllConfigValues).mockReturnValue(mockConfig)
    
    const result = await getConfigValue('game.url')
    expect(result).toBe('test-url')
  })
})
```

### 3. 测试辅助工具

Freedom 提供了测试辅助工具：

```typescript
// packages/test-utils/src/helpers/testUtils.ts
import { TestHelper, TestDataManager } from '@freedom/cli/testing'

export async function setupTestEnvironment() {
  const testHelper = new TestHelper()
  await testHelper.initialize()
  
  const sessionId = await testHelper.startTestSession('testing')
  return { testHelper, sessionId }
}

export async function createTestData(type: string) {
  const dataManager = new TestDataManager()
  return await dataManager.generateData(`test-${type}`)
}
```

## 🚀 构建和部署

### 1. 构建流程

```bash
# TypeScript 编译
pnpm build

# Bundle 打包
pnpm bundle

# 质量检查
pnpm quality
```

### 2. 构建配置

esbuild 配置 (`esbuild.config.mjs`):

```javascript
export const config = {
  entryPoints: ['packages/cli/src/index.ts'],
  bundle: true,
  outfile: 'bundle/freedom.js',
  platform: 'node',
  target: 'node18',
  format: 'esm',
  external: ['playwright', 'playwright-core'],
  minify: !isDev,
  sourcemap: isDev,
}
```

### 3. 发布流程

1. **版本管理**
   ```bash
   # 更新版本
   npm version patch|minor|major
   
   # 更新 CHANGELOG
   git add CHANGELOG.md
   ```

2. **构建验证**
   ```bash
   pnpm quality
   pnpm build
   pnpm bundle
   ```

3. **发布**
   ```bash
   git tag v0.1.0
   git push --tags
   ```

## 📚 代码规范

### 1. TypeScript 规范

- 严格模式: `"strict": true`
- 显式返回类型
- 避免 `any`，使用具体类型
- 使用 interface 而非 type（除非需要联合类型）

```typescript
// ✅ 好的做法
interface UserConfig {
  name: string
  age: number
}

async function getUser(id: string): Promise<User | null> {
  // ...
}

// ❌ 避免
function getUser(id: any): any {
  // ...
}
```

### 2. 命名规范

- 文件名: kebab-case (`config-manager.ts`)
- 目录名: kebab-case (`user-management/`)
- 变量/函数: camelCase (`getUserConfig`)
- 类名: PascalCase (`ConfigManager`)
- 常量: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`)
- 接口: PascalCase, I 前缀可选 (`UserConfig` 或 `IUserConfig`)

### 3. 文件组织

```typescript
// 1. Node.js 内置模块
import { readFile } from 'node:fs/promises'
import path from 'node:path'

// 2. 第三方依赖
import chalk from 'chalk'
import yargs from 'yargs'

// 3. 内部模块 - 绝对路径
import type { FreedomConfig } from '@freedom/shared'
import { GameController } from '@freedom/core'

// 4. 相对路径
import { validateConfig } from '../utils/validation.js'
import type { LocalConfig } from './types.js'
```

### 4. 错误处理

```typescript
// 使用自定义错误类
class ConfigurationError extends Error {
  constructor(message: string, public code?: string) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

// 优雅的错误处理
async function loadConfig(): Promise<Config> {
  try {
    const config = await readConfigFile()
    return validateConfig(config)
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new ConfigurationError('Invalid JSON format in config file')
    }
    throw error
  }
}
```

## 🔍 调试技巧

### 1. 开发时调试

```bash
# 启用调试日志
DEBUG=freedom:* pnpm dev

# VS Code 调试配置
{
  "type": "node",
  "request": "launch",
  "name": "Debug Freedom CLI",
  "program": "${workspaceFolder}/packages/cli/src/index.ts",
  "runtimeArgs": ["--loader", "tsx/esm"]
}
```

### 2. 日志系统

```typescript
import { createLogger } from '@freedom/logger'

const logger = createLogger('my-module')

logger.debug('Debug information')
logger.info('General information') 
logger.warn('Warning message')
logger.error('Error occurred', { error })
```

### 3. 性能监控

```typescript
import { performance } from 'node:perf_hooks'

function measurePerformance<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = performance.now()
    try {
      const result = await fn()
      const end = performance.now()
      console.log(`Execution time: ${end - start}ms`)
      resolve(result)
    } catch (error) {
      reject(error)
    }
  })
}
```

## 🤝 贡献指南

### 1. 工作流

1. Fork 项目
2. 创建功能分支: `git checkout -b feature/awesome-feature`
3. 提交变更: `git commit -m 'feat: add awesome feature'`
4. 推送分支: `git push origin feature/awesome-feature`
5. 创建 Pull Request

### 2. 提交规范

使用 [Conventional Commits](https://conventionalcommits.org/):

```
feat: 添加新功能
fix: 修复问题
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
perf: 性能优化
test: 测试相关
chore: 构建过程或辅助工具变动
```

### 3. Pull Request 检查清单

- [ ] 代码通过所有测试
- [ ] 添加了必要的测试
- [ ] 更新了相关文档
- [ ] 遵循代码规范
- [ ] 提交信息符合规范
- [ ] 没有引入破坏性变更（或已文档化）

## 🔧 故障排除

### 常见开发问题

#### TypeScript 编译错误
```bash
# 清理构建缓存
rm -rf packages/*/dist
rm tsconfig.tsbuildinfo

# 重新构建
pnpm build
```

#### 依赖问题
```bash
# 清理依赖
rm -rf node_modules packages/*/node_modules
pnpm store prune

# 重新安装
pnpm install
```

#### 测试问题
```bash
# 清理测试缓存
rm -rf coverage .nyc_output

# 重新运行测试
pnpm test
```

## 📖 参考资源

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Guide](https://vitest.dev/guide/)
- [ESLint Rules](https://eslint.org/docs/rules/)
- [pnpm Workspace](https://pnpm.io/workspaces)

---

欢迎加入 Freedom 开发社区！如有问题，请通过 [GitHub Issues](https://github.com/caterpi11ar/freedom/issues) 或 [Discussions](https://github.com/caterpi11ar/freedom/discussions) 联系我们。