# Freedom CLI 用户指南

Freedom 是一款专为原神云游戏自动化设计的命令行工具，基于 TypeScript 和 Playwright 构建，提供强大的游戏自动化功能。

## 🚀 快速开始

### 系统要求

- Node.js >= 18.0.0
- pnpm >= 9.6.0
- 操作系统：Windows、macOS、Linux

### 安装

1. **克隆仓库**
   ```bash
   git clone https://github.com/caterpi11ar/freedom.git
   cd freedom
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **构建项目**
   ```bash
   pnpm build
   ```

4. **创建可执行文件**
   ```bash
   pnpm bundle
   ```

### 首次运行

1. **启动 Freedom CLI**
   ```bash
   # 开发模式
   pnpm dev
   
   # 或使用构建后的版本
   node bundle/freedom.js
   ```

2. **进入交互模式**
   
   Freedom CLI 会显示欢迎界面并进入交互模式：
   ```
    ███████╗██████╗ ███████╗███████╗██████╗  ██████╗ ███╗   ███╗
    ██╔════╝██╔══██╗██╔════╝██╔════╝██╔══██╗██╔═══██╗████╗ ████║
    █████╗  ██████╔╝█████╗  █████╗  ██║  ██║██║   ██║██╔████╔██║
    ██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ██║  ██║██║   ██║██║╚██╔╝██║
    ██║     ██║  ██║███████╗███████╗██████╔╝╚██████╔╝██║ ╚═╝ ██║
    ╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚═════╝  ╚═════╝ ╚═╝     ╚═╝
    
   🎮 Genshin Impact Automation Tool
   Version: 0.1.0
   
   💡 进入交互式模式...
   输入 /help 查看可用命令
   
   freedom> 
   ```

## 📋 核心功能

### 1. 游戏管理

#### 启动游戏会话
```bash
freedom> /game start
```

支持的选项：
- `--profile <name>`: 使用指定配置文件
- `--headless`: 无头模式运行（后台运行）
- `--url <url>`: 自定义游戏URL
- `--region <region>`: 设置服务器区域
- `--timeout <seconds>`: 设置连接超时时间

#### 停止游戏会话
```bash
freedom> /game stop
```

#### 查看游戏状态
```bash
freedom> /game status
```

#### 重启游戏
```bash
freedom> /game restart
```

### 2. 脚本管理

#### 列出所有脚本
```bash
freedom> /script list
```

#### 运行脚本
```bash
freedom> /script run
```

选择要运行的脚本后，可以配置运行参数：
- 传递参数给脚本
- 设置无头模式
- 配置超时时间
- 启用调试模式

#### 创建新脚本
```bash
freedom> /script create
```

系统会引导您创建新的自动化脚本。

#### 编辑脚本
```bash
freedom> /script edit
```

#### 删除脚本
```bash
freedom> /script delete
```

### 3. 配置管理

#### 查看配置
```bash
# 查看特定配置
freedom> /config get

# 列出所有配置
freedom> /config list
```

#### 设置配置
```bash
freedom> /config set
```

常用配置项：
- `game.url`: 游戏URL
- `game.region`: 服务器区域
- `game.headless`: 无头模式
- `automation.timeout`: 操作超时时间
- `automation.retry.count`: 重试次数
- `logging.level`: 日志级别

#### 重置配置
```bash
freedom> /config reset
```

### 4. 扩展管理

#### 列出扩展
```bash
freedom> /extension list
```

#### 安装扩展
```bash
freedom> /extension install
```

支持的安装源：
- **注册表**: `freedom> /extension install extension-name`
- **本地路径**: `freedom> /extension install ./path/to/extension`
- **Git仓库**: `freedom> /extension install https://github.com/user/extension.git`

#### 启用/禁用扩展
```bash
freedom> /extension enable
freedom> /extension disable
```

#### 卸载扩展
```bash
freedom> /extension uninstall
```

### 5. 调试工具

#### 查看日志
```bash
freedom> /debug log
```

支持的选项：
- 设置日志级别过滤
- 查看指定时间范围的日志
- 实时监控模式

#### 系统诊断
```bash
freedom> /debug doctor
```

会检查：
- Node.js 版本兼容性
- 依赖完整性
- 配置正确性
- 系统资源状态

#### 性能监控
```bash
freedom> /debug monitor
```

监控内容：
- CPU 和内存使用率
- 游戏会话状态
- 脚本执行性能
- 网络连接状态

## 🎮 使用场景

### 场景 1：日常任务自动化

1. **配置游戏设置**
   ```bash
   freedom> /config set game.region asia
   freedom> /config set automation.timeout 30000
   ```

2. **启动游戏**
   ```bash
   freedom> /game start --headless
   ```

3. **运行日常任务脚本**
   ```bash
   freedom> /script run
   # 选择 "daily-tasks"
   ```

### 场景 2：扩展开发测试

1. **创建测试扩展**
   ```bash
   freedom> /extension create my-test-extension
   ```

2. **安装并启用**
   ```bash
   freedom> /extension install ./extensions/my-test-extension
   freedom> /extension enable my-test-extension
   ```

3. **测试扩展功能**
   ```bash
   freedom> /script run
   # 使用扩展提供的脚本
   ```

### 场景 3：问题诊断

1. **运行系统诊断**
   ```bash
   freedom> /debug doctor
   ```

2. **查看详细日志**
   ```bash
   freedom> /debug log --level debug --tail 100
   ```

3. **监控系统资源**
   ```bash
   freedom> /debug monitor --watch
   ```

## 🔧 高级功能

### 配置文件自定义

Freedom 支持多层配置系统：

1. **默认配置**: 内置的默认设置
2. **全局配置**: `~/.freedom/config.json`
3. **项目配置**: `./freedom.config.json`
4. **环境变量**: `FREEDOM_*` 前缀的环境变量

### 扩展开发

创建自定义扩展来扩展 Freedom 的功能：

```typescript
// extensions/my-extension/src/index.ts
import type { ExtensionContext } from '@freedom/shared'

export async function onEnable(context: ExtensionContext) {
  context.logger.info('My extension enabled')
  
  // 注册自定义命令
  context.api.registerCommand?.('my-command', async () => {
    context.logger.info('Custom command executed')
  })
}

export async function onDisable(context: ExtensionContext) {
  context.logger.info('My extension disabled')
}
```

### 脚本自定义

使用 TypeScript 编写自动化脚本：

```typescript
// scripts/my-script.ts
import { GameController } from '@freedom/core'

export async function execute(controller: GameController) {
  // 等待游戏加载
  await controller.waitForElement('.game-loaded')
  
  // 执行游戏操作
  await controller.click('.daily-task-button')
  await controller.wait(2000)
  
  // 截图保存
  await controller.screenshot('task-completed.png')
}
```

## ❓ 故障排除

### 常见问题

#### 1. 游戏无法启动
```bash
# 检查配置
freedom> /config get game.url

# 运行诊断
freedom> /debug doctor

# 查看详细日志
freedom> /debug log --level error
```

#### 2. 脚本执行失败
```bash
# 检查脚本状态
freedom> /script list

# 查看脚本日志
freedom> /debug log --filter script

# 运行性能监控
freedom> /debug monitor
```

#### 3. 扩展无法加载
```bash
# 检查扩展状态
freedom> /extension list

# 验证扩展完整性
freedom> /extension validate <extension-name>

# 重新安装扩展
freedom> /extension uninstall <extension-name>
freedom> /extension install <extension-name>
```

### 日志位置

- **应用日志**: `.freedom/logs/`
- **游戏会话日志**: `.freedom/logs/sessions/`
- **脚本执行日志**: `.freedom/logs/scripts/`
- **扩展日志**: `.freedom/logs/extensions/`

### 获取帮助

- **在线帮助**: `freedom> /help`
- **命令帮助**: `freedom> /<command> --help`
- **问题反馈**: [GitHub Issues](https://github.com/caterpi11ar/freedom/issues)
- **讨论社区**: [GitHub Discussions](https://github.com/caterpi11ar/freedom/discussions)

## 🚀 下一步

- 探索 [开发者文档](./developer-guide.md) 了解扩展开发
- 查看 [示例脚本](./examples/) 获取灵感
- 参与 [社区讨论](https://github.com/caterpi11ar/freedom/discussions) 分享经验

---

**注意**: Freedom 是为学习和研究目的开发的工具。请遵守游戏服务条款，负责任地使用自动化功能。