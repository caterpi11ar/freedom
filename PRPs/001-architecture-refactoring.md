# PRP-001: Freedom 项目架构重构方案

## 📋 概述

**状态**: 提案阶段
**提案人**: Claude
**创建时间**: 2025-09-10
**优先级**: 高

本提案旨在将 Freedom 项目重构为基于 Gemini-CLI 架构模式的现代化 TypeScript monorepo，提升项目的可维护性、可扩展性和开发体验。

## 🎯 背景与动机

### 当前状况

Freedom 项目是一个云原神自动化工具，具备以下特点：
- 🎮 基于 playwright 的浏览器自动化
- 🏗️ 采用 pnpm workspace 的 monorepo 架构
- 📦 包含 7 个包：cli, core, executor, logger, shared, storage, webhook
- 🎯 专注于游戏自动化脚本执行

### 存在的问题

1. **架构复杂性**: 包之间的依赖关系不够清晰，职责边界模糊
2. **构建系统**: 缺乏统一的构建和打包机制
3. **扩展性**: 缺少插件系统和工具注册机制
4. **测试工具**: 缺少专门的测试工具包
5. **开发体验**: 构建速度和开发工具链有待改进

### 参考架构: Gemini-CLI

Gemini-CLI 作为 Google 的成熟 AI 编程助手工具，具备：
- 🏢 企业级架构设计
- 📦 清晰的模块化包结构
- 🔧 完善的工具链和构建系统
- 🧪 完整的测试工具生态

#### Gemini-CLI 深度架构分析

**1. CLI 包整体架构设计**
- **主入口文件**: `packages/cli/index.ts` - 全局错误处理和程序启动
- **核心入口**: `packages/cli/src/gemini.tsx` - 主要的应用逻辑和配置加载
- **非交互式CLI**: `packages/cli/src/nonInteractiveCli.ts` - 处理非交互模式
- **关键特点**: 分层错误处理（FatalError vs 通用错误）、支持交互式和非交互式两种模式

**2. 命令系统组织方式**
```
packages/cli/src/commands/
├── extensions/          # 扩展管理命令
│   ├── install.ts      # 安装扩展
│   ├── uninstall.ts    # 卸载扩展
│   ├── list.ts         # 列出扩展
│   ├── update.ts       # 更新扩展
│   ├── enable.ts       # 启用扩展
│   ├── disable.ts      # 禁用扩展
│   ├── link.ts         # 本地扩展链接
│   └── new.ts          # 创建新扩展
├── mcp/                # MCP 服务器管理命令
│   ├── add.ts
│   ├── remove.ts
│   └── list.ts
├── extensions.tsx      # 扩展命令组
└── mcp.ts             # MCP 命令组
```

**命令组织模式**:
- 采用 yargs 进行命令行解析
- 命令按功能模块分组（extensions, mcp）
- 支持子命令的嵌套结构
- 统一的错误处理和验证机制

**3. 配置管理系统**
- **多层配置架构**: SystemDefaults → System → User (全局) → Workspace (项目特定)
- **配置特性**: 支持环境变量替换、配置验证和类型安全、热重载机制、向后兼容性处理

**4. 插件/扩展系统**
```typescript
export interface Extension {
  path: string
  config: ExtensionConfig
  contextFiles: string[]
  installMetadata?: ExtensionInstallMetadata
}
```
- **扩展管理功能**: Git 仓库、本地路径、符号链接安装
- **生命周期管理**: 安装、卸载、启用、禁用、更新
- **版本控制**: 版本检查和回滚机制

**5. 错误处理和用户反馈机制**
- **分层错误处理**: FatalError（致命错误，导致程序退出）、业务逻辑错误（可恢复）、验证错误（输入验证和配置错误）
- **用户反馈系统**: ConsolePatcher 控制台输出管理、启动警告系统、调试模式支持

**6. 构建系统特点**
```markdown
// esbuild 配置特点
{
  entryPoints: ['packages/cli/index.ts'],
  bundle: true,
  outfile: 'bundle/gemini.js',
  platform: 'node',
  format: 'esm',
  external: [...optionalDependencies],
  // ESM 兼容性处理
  banner: {
    js: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);`,
  },
}
```
- **构建特性**: 单文件捆绑、平台优化、外部依赖、版本注入、别名支持

**7. 测试工具包设计**
```typescript
export interface FileSystemStructure {
  [name: string]:
    | string
    | FileSystemStructure
    | Array<string | FileSystemStructure>
}
```
- **测试特性**: 虚拟文件系统创建、临时目录管理、结构化测试数据、清理机制

## 🏗️ 重构方案

### 1. 包架构重组

严格参照 Gemini-CLI 架构模式，重新设计包结构：

```
packages/
├── cli/                    # 命令行界面 (对应 @google/gemini-cli)
│   ├── src/
│   │   ├── commands/       # 各种命令实现
│   │   ├── display/        # 界面显示逻辑
│   │   ├── state/          # 状态管理
│   │   └── utils/          # CLI 工具函数
│   └── package.json
├── core/                   # 核心框架 (对应 @google/gemini-cli-core)
│   ├── src/
│   │   ├── automation/     # 自动化核心逻辑
│   │   ├── browser/        # 浏览器管理
│   │   ├── config/         # 配置管理
│   │   ├── tools/          # 工具注册系统
│   │   ├── services/       # 核心服务
│   │   └── utils/          # 核心工具函数
│   └── package.json
└── test-utils/            # 测试工具 (对应 @google/gemini-cli-test-utils)
    ├── src/
    │   ├── mocks/         # 模拟对象
    │   ├── fixtures/      # 测试数据
    │   └── helpers/       # 测试辅助函数
    └── package.json
```

### 2. 核心模块重构

#### `@freedom/core` 重构 (对应 @google/gemini-cli-core)

**核心功能** (严格参照 gemini-cli-core):
- 游戏自动化客户端 (对应 gemini-cli 的 client)
- 内容生成器和日志记录 (对应 contentGenerator, loggingContentGenerator)
- 工具调度器 (对应 coreToolScheduler)
- 非交互式工具执行器 (对应 nonInteractiveToolExecutor)
- 配置管理和验证系统

**架构模块**:
- 自动化核心逻辑 (automation/)
- 浏览器服务管理 (browser/)
- 配置和存储管理 (config/)
- 工具注册系统 (tools/)
- 核心服务层 (services/)
- 工具函数库 (utils/)

**导出结构** (严格参照 gemini-cli-core):
```typescript
// 导出配置管理
export * from './config/config.js'

// 导出核心逻辑
export * from './core/client.js'
export * from './core/contentGenerator.js'
export * from './core/coreToolScheduler.js'
export * from './core/gameChat.js'
export * from './core/logger.js'
export * from './core/loggingContentGenerator.js'
export * from './core/nonInteractiveToolExecutor.js'
export * from './core/prompts.js'
export * from './core/turn.js'

export * from './services/browserService.js'
// 导出服务
export * from './services/fileDiscoveryService.js'
export * from './services/gameService.js'

export * from './tools/tool-error.js'
export * from './tools/tool-registry.js'
// 导出工具系统
export * from './tools/tools.js'

export * from './utils/errors.js'
export * from './utils/gameUtils.js'
// 导出工具函数
export * from './utils/paths.js'
```

#### `@freedom/cli` 增强 (对应 @google/gemini-cli)

**架构转换** - 从 Commander.js 迁移到 yargs:
- 保持交互式命令行界面架构完整性
- 迁移现有斜杠命令系统到模块化命令组
- 保持状态管理和提示符基础设施
- 增强错误处理和用户反馈机制

**详细包结构设计**:
```
packages/cli/
├── src/
│   ├── commands/              # 命令实现 (基于 yargs 架构)
│   │   ├── game/              # 游戏控制命令组
│   │   │   ├── start.ts       # 启动游戏会话
│   │   │   ├── stop.ts        # 停止游戏会话
│   │   │   ├── status.ts      # 查看游戏状态
│   │   │   └── restart.ts     # 重启游戏会话
│   │   ├── script/            # 脚本管理命令组
│   │   │   ├── list.ts        # 列出可用脚本
│   │   │   ├── run.ts         # 执行脚本
│   │   │   ├── create.ts      # 创建新脚本
│   │   │   ├── edit.ts        # 编辑脚本
│   │   │   └── delete.ts      # 删除脚本
│   │   ├── config/            # 配置管理命令组
│   │   │   ├── get.ts         # 获取配置值
│   │   │   ├── set.ts         # 设置配置值
│   │   │   ├── list.ts        # 列出所有配置
│   │   │   └── reset.ts       # 重置配置
│   │   ├── extension/         # 扩展管理命令组
│   │   │   ├── install.ts     # 安装扩展
│   │   │   ├── uninstall.ts   # 卸载扩展
│   │   │   ├── list.ts        # 列出扩展
│   │   │   ├── enable.ts      # 启用扩展
│   │   │   └── disable.ts     # 禁用扩展
│   │   ├── debug/             # 调试工具命令组
│   │   │   ├── log.ts         # 查看日志
│   │   │   ├── doctor.ts      # 诊断工具
│   │   │   └── monitor.ts     # 性能监控
│   │   ├── game.tsx           # 游戏命令组入口
│   │   ├── script.tsx         # 脚本命令组入口
│   │   ├── config.tsx         # 配置命令组入口
│   │   ├── extension.tsx      # 扩展命令组入口
│   │   └── debug.tsx          # 调试命令组入口
│   ├── config/                # 配置管理 (多层配置架构)
│   │   ├── config.ts          # 配置加载和验证
│   │   ├── defaults.ts        # 默认配置值
│   │   ├── schema.ts          # 配置模式定义
│   │   └── migration.ts       # 配置迁移工具
│   ├── display/               # 界面显示逻辑
│   │   ├── prompt.ts          # 交互式提示符
│   │   ├── formatter.ts       # 输出格式化
│   │   ├── progress.ts        # 进度指示器
│   │   └── console.ts         # 控制台管理
│   ├── extensions/            # 扩展系统
│   │   ├── loader.ts          # 扩展加载器
│   │   ├── manager.ts         # 扩展管理器
│   │   ├── registry.ts        # 扩展注册表
│   │   └── validator.ts       # 扩展验证器
│   ├── state/                 # 状态管理 (保持现有架构)
│   │   ├── bridge.ts          # 状态桥接
│   │   ├── store.ts           # 本地状态存储
│   │   └── types.ts           # 状态类型定义
│   ├── utils/                 # 工具函数
│   │   ├── errors.ts          # 分层错误处理
│   │   ├── logger.ts          # 日志工具
│   │   ├── paths.ts           # 路径工具
│   │   ├── validation.ts      # 输入验证
│   │   └── time.ts            # 时间工具
│   ├── freedom.tsx            # 主程序入口 (基于 yargs)
│   ├── nonInteractiveCli.ts   # 非交互式模式
│   └── interactive.ts         # 交互式模式
├── index.ts                   # 全局入口点 (错误处理)
├── package.json
└── tsconfig.json
```

**核心架构特性** (严格参照 gemini-cli):

1. **命令系统架构**:
```typescript
// freedom.tsx - 主程序入口
export async function main() {
  const cli = yargs(hideBin(process.argv))
    .scriptName('freedom')
    .usage('$0 <command> [options]')
    .command(gameCommand)
    .command(scriptCommand)
    .command(configCommand)
    .command(extensionCommand)
    .command(debugCommand)
    .demandCommand(1, 'You need at least one command.')
    .help()
    .version()

  await cli.argv
}
```

2. **命令组模式**:
```typescript
// game.tsx - 游戏命令组
export const gameCommand: CommandModule = {
  command: 'game <command>',
  describe: 'Manage game automation sessions.',
  builder: yargs =>
    yargs
      .command(startCommand)
      .command(stopCommand)
      .command(statusCommand)
      .command(restartCommand)
      .demandCommand(1, 'You need at least one game command.')
      .help(),
  handler: () => { /* 子命令处理 */ },
}
```

3. **多层配置管理**:
```typescript
// config/config.ts - 配置管理系统
export interface FreedomConfig {
  game: {
    url: string
    region: 'cn' | 'global'
    language: string
    autoLogin: boolean
  }
  automation: {
    headless: boolean
    slowMo: number
    timeout: number
    retryAttempts: number
  }
  cli: {
    theme: 'dark' | 'light' | 'auto'
    verbosity: 'quiet' | 'normal' | 'verbose' | 'debug'
    interactive: boolean
  }
  extensions: {
    enabled: string[]
    disabled: string[]
    autoInstall: boolean
  }
}
```

4. **扩展系统接口**:
```typescript
// extensions/types.ts - 扩展系统
export interface FreedomExtension {
  name: string
  version: string
  description?: string

  // 生命周期钩子
  activate?: (context: ExtensionContext) => Promise<void>
  deactivate?: () => Promise<void>

  // 功能贡献
  commands?: ExtensionCommand[]
  scripts?: ExtensionScript[]
  configurations?: ExtensionConfiguration[]
}
```

5. **分层错误处理**:
```typescript
// utils/errors.ts - 错误处理机制
export class FreedomError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly exitCode: number = 1
  ) {
    super(message)
    this.name = 'FreedomError'
  }
}

export class FatalError extends FreedomError { /* 致命错误 */ }
export class ConfigurationError extends FreedomError { /* 配置错误 */ }
export class GameAutomationError extends FreedomError { /* 游戏自动化错误 */ }
```

**功能迁移映射**:
- 现有 `start.ts` → `commands/game/start.ts`
- 现有 `stop.ts` → `commands/game/stop.ts`
- 现有 `status.ts` → `commands/game/status.ts`
- 现有 `restart.ts` → `commands/game/restart.ts`
- 现有 `scripts.ts` → `commands/script/run.ts`
- 现有 `config.ts` → `commands/config/` 命令组
- 现有 `log.ts` → `commands/debug/log.ts`
- 现有 `doctor.ts` → `commands/debug/doctor.ts`
- 现有 `task.ts` → `commands/script/run.ts`

**保持向后兼容性**:
- 所有现有命令功能保持 100% 完整
- 与 `@freedom/shared` 状态系统的集成保持不变
- 交互式提示符和状态显示保持现有体验
- 逐步迁移机制确保平滑过渡

### 3. 构建系统统一

采用 Gemini-CLI 的构建模式：

#### ESBuild 配置
```javascript
// esbuild.config.js
import { build } from 'esbuild'

const config = {
  entryPoints: ['packages/cli/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'esm',
  outfile: 'bundle/freedom.js',
  external: ['playwright'],
  banner: {
    js: '#!/usr/bin/env node'
  }
}

await build(config)
```

#### 统一构建脚本
- `scripts/build.js` - 构建所有包
- `scripts/build_package.js` - 构建单个包
- `scripts/bundle.js` - 创建可执行 bundle
- `scripts/version.js` - 版本管理

#### Package.json 更新
```json
{
  "scripts": {
    "build": "node scripts/build.js",
    "bundle": "npm run generate && node esbuild.config.js",
    "build:packages": "npm run build --workspaces",
    "prepare": "npm run bundle"
  },
  "bin": {
    "freedom": "bundle/freedom.js"
  },
  "files": [
    "bundle/",
    "README.md",
    "LICENSE"
  ]
}
```

### 4. 测试和开发工具

#### `@freedom/test-utils` 包 (对应 @google/gemini-cli-test-utils)

**功能特性** (参照 gemini-cli-test-utils):
- 模拟游戏环境的测试工具
- Playwright 页面模拟器
- 自动化脚本测试框架
- 测试辅助函数和工具

**架构设计** (参照 gemini-cli-test-utils):
```typescript
// packages/test-utils/src/index.ts
export class MockGameEnvironment {
  async createMockPage(): Promise<Page> {
    // 创建模拟游戏页面
  }

  async simulateGameAction(action: string): Promise<void> {
    // 模拟游戏操作
  }
}

export class TestUtilities {
  // 参照 gemini-cli-test-utils 的工具函数结构
  static createMockConfig(): Config {
    // 创建测试配置
  }

  static setupTestEnvironment(): void {
    // 设置测试环境
  }
}
```

#### 集成测试框架
- Vitest 配置优化
- E2E 测试支持
- 性能回归测试
- 自动化 CI/CD 流程

## 🎯 项目目标

本次重构专注于**架构设计和基础设施建设**，不实现具体的业务功能：

### 架构目标
✅ **建立清晰的模块架构**
- 设计合理的包结构和依赖关系
- 定义清晰的模块边界和接口
- 建立可扩展的插件架构

✅ **构建完善的开发基础设施**
- 统一的构建系统和工具链
- 完整的类型定义和接口设计
- 可维护的配置管理架构

✅ **创建企业级架构规范**
- 参考 Gemini-CLI 的成熟架构模式
- 建立代码质量和开发规范
- 设计可扩展的测试框架

### 交付范围
🚧 **仅包含架构设计，不包含功能实现**
- 包结构和依赖关系设计
- TypeScript 接口和类型定义
- 构建系统和开发工具配置
- 测试框架和工具架构
- 文档和开发规范

## 📋 详细实施计划

### 🚀 Phase 1: 基础架构重构 (3-4 天)

#### 🎯 目标
建立新的包结构，迁移构建系统，保持现有功能正常运行

#### 📝 任务分解

**任务 1.1: 包结构重组 (1 天)**
- **创建新的目录结构**
  ```bash
  mkdir -p packages/cli/src/{commands,config,display,extensions,state,utils}
  mkdir -p packages/cli/src/commands/{game,script,config,extension,debug}
  mkdir -p packages/test-utils/src/{mocks,fixtures,helpers}
  ```
- **设置基础配置文件**
  - 更新 `packages/cli/package.json` - 添加新依赖 (yargs, chalk, ora)
  - 创建 `packages/test-utils/package.json`
  - 配置包间依赖关系
- **TypeScript 配置优化**
  - 更新 `tsconfig.json` 中的 path mapping
  - 配置 composite builds
  - 设置严格的类型检查

**任务 1.2: 构建系统迁移 (1 天)**
- **安装和配置 esbuild**: `pnpm add -w esbuild`
- **创建构建脚本**
  - `scripts/build.js` - 构建所有包
  - `scripts/bundle.js` - 创建单文件 bundle
  - `esbuild.config.js` - esbuild 主配置
- **更新 package.json 脚本**
  ```json
  {
    "scripts": {
      "build": "node scripts/build.js",
      "bundle": "node esbuild.config.js",
      "dev": "tsx packages/cli/index.ts",
      "build:watch": "node esbuild.config.js --watch"
    }
  }
  ```

**任务 1.3: 核心入口重构 (1 天)**
- **重写主入口文件**
  - `packages/cli/index.ts` - 全局错误处理
  - `packages/cli/src/freedom.tsx` - 主程序逻辑
  - `packages/cli/src/nonInteractiveCli.ts` - 非交互模式
- **实现错误处理系统**
  - `src/utils/errors.ts` - 分层错误类
  - 全局异常捕获和处理
  - 友好的错误消息显示
- **保持向后兼容**
  - 确保现有命令仍可正常运行
  - 临时兼容层处理

**任务 1.4: 配置系统基础 (1 天)**
- **配置模式定义**
  - `src/config/schema.ts` - 配置的 TypeScript 接口
  - `src/config/defaults.ts` - 默认配置值
  - `src/config/validation.ts` - 配置验证逻辑
- **配置加载逻辑**
  - `src/config/config.ts` - 多层配置加载
  - 环境变量支持
  - 配置文件搜索路径
- **迁移现有配置**
  - 分析现有 `@freedom/shared` 的配置
  - 数据迁移脚本
  - 兼容性处理

**✅ 验收标准**:
- [ ] 所有构建命令正常执行
- [ ] 现有功能保持完整
- [ ] 类型检查无错误
- [ ] 代码规范检查通过

---

### 📋 Phase 2: 命令系统重构 (4-5 天)

#### 🎯 目标
将现有的 Commander.js 命令系统迁移到基于 yargs 的模块化架构

#### 📝 任务分解

**任务 2.1: 命令架构设计 (1 天)**
- **分析现有命令**
  ```bash
  # 当前 CLI 命令分析
  packages/cli/src/commands/
  ├── config.ts    → 迁移到 commands/config/
  ├── start.ts     → 迁移到 commands/game/start.ts
  ├── stop.ts      → 迁移到 commands/game/stop.ts
  ├── status.ts    → 迁移到 commands/game/status.ts
  ├── restart.ts   → 迁移到 commands/game/restart.ts
  ├── scripts.ts   → 迁移到 commands/script/
  ├── log.ts       → 迁移到 commands/debug/log.ts
  ├── doctor.ts    → 迁移到 commands/debug/doctor.ts
  └── task.ts      → 迁移到 commands/script/run.ts
  ```
- **设计新的命令组结构**
  - 创建命令组入口文件 (`game.tsx`, `script.tsx` 等)
  - 定义统一的命令接口
  - 设计命令参数和选项规范
- **yargs 集成设计**
  - 命令解析器配置
  - 中间件系统设计
  - 帮助和错误处理

**任务 2.2: 游戏控制命令组 (1 天)**
- **迁移游戏相关命令**
  ```typescript
  // commands/game/start.ts
  export const startCommand: CommandModule = {
    command: 'start [profile]',
    describe: 'Start a game automation session',
    builder: yargs => yargs
      .positional('profile', {
        describe: 'Game profile to use',
        type: 'string',
        default: 'default'
      })
      .option('headless', {
        describe: 'Run in headless mode',
        type: 'boolean',
        default: false
      }),
    handler: async (argv) => {
      // 实现逻辑
    }
  }
  ```
- **保持现有功能**
  - 迁移启动、停止、重启、状态查询逻辑
  - 保持与 `@freedom/shared` 状态系统的集成
  - 错误处理和用户反馈
- **增强功能**
  - 更好的参数验证
  - 进度指示器
  - 详细的状态信息显示

**任务 2.3: 脚本管理命令组 (1 天)**
- **脚本相关命令实现**
  - `script list` - 列出可用脚本
  - `script run <name>` - 执行指定脚本
  - `script create <name>` - 创建新脚本模板
  - `script edit <name>` - 编辑脚本 (调用默认编辑器)
  - `script delete <name>` - 删除脚本
- **脚本管理功能**
  - 脚本发现和索引
  - 脚本模板系统
  - 脚本验证和语法检查
- **集成自动化引擎**
  - 与 `@freedom/core` 的集成接口设计
  - 脚本执行监控
  - 实时日志输出

**任务 2.4: 配置和调试命令组 (1 天)**
- **配置管理命令**
  ```bash
  freedom config get game.url
  freedom config set game.url "https://ys.mihoyo.com"
  freedom config list
  freedom config reset
  ```
- **调试工具命令**
  ```bash
  freedom debug log --tail -n 100
  freedom debug doctor
  freedom debug monitor --watch
  ```
- **高级功能**
  - 配置模式验证
  - 配置导入/导出
  - 系统诊断报告
  - 性能监控界面

**任务 2.5: 扩展管理基础 (1 天)**
- **扩展管理命令框架**
  ```bash
  freedom extension list
  freedom extension install <name|path|git-url>
  freedom extension uninstall <name>
  freedom extension enable <name>
  freedom extension disable <name>
  ```
- **扩展系统基础**
  - 扩展发现和加载机制
  - 扩展配置管理
  - 扩展生命周期管理
- **扩展接口设计**
  - 扩展 API 定义
  - 扩展上下文提供
  - 扩展通信机制

**✅ 验收标准**:
- [ ] 所有命令功能完整迁移
- [ ] 命令行参数和选项正确处理
- [ ] 错误处理和用户反馈友好
- [ ] 帮助文档完整准确
- [ ] 性能无明显下降

---

### 📋 Phase 3: 高级功能实现 (3-4 天)

#### 🎯 目标
实现扩展系统、配置管理高级功能、测试工具包

#### 📝 任务分解

**任务 3.1: 扩展系统完整实现 (2 天)**
- **扩展加载器实现**
  - 扩展发现机制 (文件系统扫描)
  - 扩展验证和安全检查
  - 动态模块加载
  - 依赖解析和冲突检测
- **扩展管理器实现**
  - 扩展生命周期管理
  - 扩展注册表维护
  - 扩展通信总线
  - 扩展权限控制
- **扩展开发工具**
  - 扩展模板生成器
  - 扩展打包工具
  - 扩展调试支持

**任务 3.2: 配置管理高级功能 (1 天)**
- **配置迁移系统**
  - 版本检测机制
  - 自动迁移脚本
  - 迁移失败恢复
- **配置同步和备份**
  - 配置导出/导入功能
  - 配置模板系统
  - 配置版本管理
- **高级配置功能**
  - 配置验证和提示
  - 配置热重载
  - 配置变更监听

**任务 3.3: 测试工具包实现 (1 天)**
- **测试辅助工具**
  ```typescript
  // MockGameEnvironment 实现
  export class MockGameEnvironment {
    async createMockPage(): Promise<Page>
    async simulateGameAction(action: string): Promise<void>
    async mockGameElements(): Promise<void>
  }
  ```
- **测试数据管理**
  - 测试夹具 (fixtures) 系统
  - 测试数据生成器
  - 测试环境清理工具
- **集成测试支持**
  - E2E 测试框架集成
  - 性能测试工具
  - 回归测试自动化

**✅ 验收标准**:
- [ ] 扩展系统功能完整
- [ ] 配置管理功能齐全
- [ ] 测试工具可用
- [ ] 所有功能经过测试

---

### 📋 Phase 4: 优化和文档 (2-3 天)

#### 🎯 目标
性能优化、文档完善、发布准备

#### 📝 任务分解

**任务 4.1: 性能优化 (1 天)**
- **Bundle 优化**
  - 依赖分析和树摇
  - Bundle 大小监控
  - 启动时间优化
  - 内存使用优化
- **代码质量优化**
  - 死代码清理
  - 类型定义完善
  - 错误处理优化
  - 代码重构

**任务 4.2: 文档和示例 (1-2 天)**
- **用户文档**
  - 安装和快速开始指南
  - 命令参考文档
  - 配置说明文档
  - 故障排除指南
- **开发者文档**
  - 架构设计文档
  - API 参考文档
  - 扩展开发指南
  - 贡献指南
- **示例和教程**
  - 基础使用示例
  - 扩展开发示例
  - 最佳实践指南

**✅ 验收标准**:
- [ ] 性能符合预期
- [ ] 文档完整准确
- [ ] 示例可运行
- [ ] 发布准备完成

## 🗓️ 总体时间线

| 阶段 | 内容 | 预计时间 | 关键里程碑 |
|------|------|----------|------------|
| **Phase 1** | 基础架构重构 | 3-4 天 | ✅ 新架构运行 |
| **Phase 2** | 命令系统重构 | 4-5 天 | ✅ 命令功能完整 |
| **Phase 3** | 高级功能实现 | 3-4 天 | ✅ 扩展系统可用 |
| **Phase 4** | 优化和文档 | 2-3 天 | ✅ 发布就绪 |

**总预计时间**: 12-16 天

## 🎯 关键成功指标

1. **功能完整性**: 现有功能 100% 保持
2. **性能提升**: 启动时间减少 30%+
3. **用户体验**: 错误处理更友好，帮助更完善
4. **扩展能力**: 扩展系统可正常工作
5. **代码质量**: 类型覆盖 95%+，无 lint 错误

## 📞 下一步行动

1. **获得批准**: 等待项目所有者确认此重构方案
2. **资源分配**: 确认开发资源和时间安排
3. **开始执行**: 按照实施计划逐步执行
4. **持续沟通**: 定期更新进度和收集反馈

---

**文档版本**: 1.0
**最后更新**: 2025-09-10
**审核状态**: 待审核
