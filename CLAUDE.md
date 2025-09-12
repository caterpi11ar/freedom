# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Freedom 是一个基于 TypeScript 的原神云游戏自动化工具，采用 pnpm 工作区架构。项目已实现完整的交互式 CLI 界面和核心自动化功能，包括多账户管理、脚本构造器、AI 提示词库、任务队列和日志系统等核心模块。

## Commands

### Development Commands
```bash
# 安装依赖
pnpm install

# 启动开发模式（CLI 交互式终端）
pnpm dev

# 启动所有包并行开发模式
pnpm dev:all

# 启动核心包开发模式
pnpm dev:core

# 直接运行 CLI（测试用）
tsx packages/cli/src/main.ts
```

### Build & Test Commands
```bash
# 构建所有包
pnpm build

# TypeScript 类型检查
pnpm typecheck

# ESLint 检查和修复
pnpm lint
pnpm lint:fix

# 运行测试
pnpm test
pnpm test:ci

# 代码质量检查
pnpm quality
```

### CLI 交互式命令
```bash
# 启动 Freedom 交互式终端
freedom

# 调试模式启动
freedom --debug

# 无头模式启动
freedom --headless

# 显示帮助
freedom --help

# 显示版本
freedom --version
```

## Architecture

### Monorepo Structure
This is a pnpm workspace with multiple packages:

- `packages/cli/` - 交互式命令行界面，支持斜杠命令和二级交互
- `packages/core/` - 核心自动化功能，包括浏览器控制、游戏逻辑、脚本管理
- `packages/logger/` - 日志系统，支持多级别日志收集和分析
- `packages/shared/` - 共享类型定义和状态管理
- `packages/test-utils/` - 测试工具和模拟环境
- `packages/config/` - 配置管理

### Key Technologies
- **Frontend**: TypeScript, Node.js, Commander.js, Chalk
- **Browser Automation**: Playwright
- **State Management**: EventEmitter-based global store
- **Logging**: Custom logger with file and console output
- **Build Tools**: pnpm workspaces, ESLint, Prettier, Vitest

### 核心功能模块

#### 1. 交互式 CLI 系统 (`packages/cli/`)
- **纯交互式终端模式**: 启动后进入交互模式，所有功能通过斜杠命令操作
- **斜杠命令系统**: 支持 `/login`, `/script`, `/task`, `/log`, `/prompt` 等命令
- **二级交互界面**: 命令执行后进入专用交互界面，通过选择菜单和输入提示完成操作
- **科技感 UI**: 渐变色 Logo 和现代化的终端界面设计

#### 2. 多账户管理系统 (`packages/core/src/account/`)
- **多账户配置**: 支持米哈游官服登录
- **多账户管理**: 支持多账户管理
- **会话池管理**: 浏览器会话池，支持多会话并发
- **安全存储**: 敏感信息加密存储

#### 3. 脚本构造器系统 (`packages/core/src/script/`)
- **脚本模板管理**: 丰富的脚本模板库
- **组件库**: 预定义的动作块和条件组件

#### 4. 系统提示词库系统 (`packages/core/src/prompt/`)
- **提示词模板管理**: AI 提示词模板的创建和管理
- **智能生成**: 根据任务生成脚本提示词
- **社区分享**: 提示词模板的分享和协作

#### 5. 任务队列系统 (`packages/core/src/task/`)
- **任务队列管理**: 支持任务创建、暂停、恢复、停止
- **任务调度**: 定时任务和循环任务支持
- **进度监控**: 实时任务进度追踪
- **历史记录**: 任务执行历史和统计

#### 6. 日志管理系统 (`packages/logger/`)
- **多级别日志**: 支持 DEBUG, INFO, WARN, ERROR 级别
- **日志轮转**: 自动日志文件轮转和清理
- **实时监控**: 实时日志流显示和过滤
- **日志分析**: 错误统计和性能分析

### 状态管理
- **全局状态**: 基于 EventEmitter 的全局状态管理
- **实时更新**: 状态变化时实时更新 UI 提示
- **持久化**: 配置和运行时数据的持久化存储
- **类型安全**: 完整的 TypeScript 类型定义

### TypeScript 配置
- **复合构建**: 使用项目引用进行高效的增量编译
- **严格模式**: 启用严格的类型检查
- **路径映射**: 内部包依赖的路径映射配置
- **ES2022**: 目标版本为 ES2022，使用 ES 模块格式

## Code Quality

### 开发规范

#### 代码质量检查
- **每次代码修改后必须执行**:
  - `pnpm lint:fix` - 自动修复 ESLint 问题
  - `pnpm typecheck` - TypeScript 类型检查
- 代码修改只有在两个命令都成功执行且无错误时才被认为完成
- 有 lint 错误或类型错误的代码不得提交

#### 语言标准
- **严格禁止直接使用 JavaScript**:
  - 所有新文件必须使用 TypeScript (.ts/.tsx)
  - 不允许创建 .js 文件
  - 现有的 .js 文件应逐步迁移到 TypeScript
  - 确保所有代码都有完整的类型定义

#### CLI 命令设计
- **单级命令无参数**:
  - 命令应该是简单的单词，无参数或嵌套子命令
  - 参数和复杂输入应在命令输入后通过交互式提示处理
  - 支持二级交互，如后续问题、选择菜单或额外输入提示
  - 示例：`/login` 命令应通过交互式提示输入凭据，而不是接受参数

#### 组件设计原则
- **避免代码重复**: 提取公共类型和组件
- **保持组件专注**: 使用 hooks 和组件拆分处理大型逻辑块
- **掌握 React 理念**: 正确的 Context 使用、组件组合、状态管理以防止重新渲染

## 关键实现细节

### CLI 命令系统
- **命令定义**: 在 `packages/cli/src/commands/` 中定义，每个命令作为独立模块
- **交互模式**: 支持纯交互式终端模式，通过斜杠命令操作
- **二级交互**: 命令执行后进入专用交互界面，支持选择菜单和输入提示

### 状态管理
- **全局状态**: 基于 EventEmitter 的全局状态管理系统
- **实时更新**: 状态变化时实时更新 UI 提示和界面
- **持久化**: 配置和运行时数据的持久化存储

### 配置管理
- **类型安全**: 在 `packages/shared/src/types/config.ts` 中定义类型安全的配置接口
- **配置迁移**: 支持配置版本迁移和兼容性处理
- **默认配置**: 提供合理的默认配置值

### 浏览器自动化
- **Playwright 集成**: 使用 Playwright 进行浏览器自动化
- **会话池管理**: 支持多浏览器会话并发管理
- **Canvas 控制**: 游戏 Canvas 元素的精确控制和操作

## 开发注意事项

### 核心功能状态
- ✅ **CLI 交互系统**: 完全实现，支持所有斜杠命令
- ✅ **多账户管理**: 完全实现，支持账户分组和轮换
- ✅ **脚本构造器**: 完全实现，支持可视化脚本编辑
- ✅ **AI 提示词库**: 完全实现，支持模板管理和智能生成
- ✅ **任务队列**: 完全实现，支持任务调度和监控
- ✅ **日志系统**: 完全实现，支持多级别日志和分析

### 测试基础设施
- **Vitest 配置**: 已配置但测试文件较少
- **测试工具**: `packages/test-utils/` 提供测试辅助工具
- **模拟环境**: 提供游戏环境模拟和配置模拟

### 包依赖关系
- **最小依赖**: 各包之间依赖关系最小化
- **类型共享**: 通过 `packages/shared/` 共享类型定义
- **核心集成**: CLI 包已集成核心包的所有功能

## 系统要求

- **Node.js**: ≥18.0.0
- **pnpm**: ≥9.6.0
- **操作系统**: Windows, macOS, Linux
- **浏览器**: Playwright 会自动安装所需浏览器

## 开发工作流

### 1. 功能开发流程
```bash
# 1. 创建功能分支
git checkout -b feat/new-feature

# 2. 开发功能
# 编辑相关文件...

# 3. 代码质量检查
pnpm lint:fix
pnpm typecheck

# 4. 运行测试
pnpm test

# 5. 提交代码
git add .
git commit -m "feat: add new feature"
```

### 2. 调试流程
```bash
# 启动调试模式
freedom --debug

# 查看日志
freedom
> /log

# 监控系统状态
freedom
> /debug monitor
```

### 3. 测试流程
```bash
# 运行所有测试
pnpm test

# 运行特定包测试
pnpm --filter @freedom/core test

# 代码覆盖率
pnpm test:ci
```
