# Freedom CLI 基础使用示例

本文档提供 Freedom CLI 的基础使用示例，帮助新用户快速上手。

## 🚀 快速开始示例

### 示例 1: 首次设置和运行

```bash
# 1. 启动 Freedom CLI
npm start
# 或
pnpm dev

# 2. 系统诊断
freedom> /debug doctor

# 3. 配置游戏设置
freedom> /config set game.region asia
freedom> /config set game.headless false

# 4. 查看当前配置
freedom> /config list

# 5. 启动游戏会话
freedom> /game start

# 6. 查看游戏状态
freedom> /game status
```

**预期输出**:
```
🩺 System Diagnosis Results:
✅ Node.js version: v18.17.0 (compatible)
✅ Platform: Windows (supported)
✅ Memory: 512MB available
✅ Configuration: Valid

📋 Configuration Settings:
game.region              │ asia
game.headless           │ false
game.url                │ https://ys.mihoyo.com/cloud/

🎮 Starting game session...
✅ Game session started successfully
Session ID: session_12345

🎮 Game Status:
Status: Connected
Session: session_12345
Uptime: 0:00:45
```

## 📋 配置管理示例

### 示例 2: 完整配置设置

```bash
# 游戏配置
freedom> /config set game.url "https://ys.mihoyo.com/cloud/"
freedom> /config set game.region asia
freedom> /config set game.headless true

# 自动化配置
freedom> /config set automation.timeout 30000
freedom> /config set automation.retry.count 3
freedom> /config set automation.retry.delay 1000
freedom> /config set automation.screenshots true

# 日志配置
freedom> /config set logging.level info
freedom> /config set logging.console true
freedom> /config set logging.file true

# 验证配置
freedom> /config get automation
freedom> /config list --filter game
```

### 示例 3: 配置重置和备份

```bash
# 备份当前配置
freedom> /config backup --description "Before testing new settings"

# 重置特定配置
freedom> /config reset automation.timeout --confirm

# 重置所有配置（需要确认）
freedom> /config reset --confirm --backup

# 恢复配置
freedom> /config restore backup_20231210_143022
```

## 🎮 游戏会话管理示例

### 示例 4: 游戏会话完整流程

```bash
# 1. 配置游戏设置
freedom> /config set game.region asia
freedom> /config set automation.timeout 60000

# 2. 启动游戏（开发模式，显示浏览器）
freedom> /game start --profile development --headless false

# 3. 监控游戏状态
freedom> /game status

# 4. 如果需要重启游戏
freedom> /game restart

# 5. 完成后停止游戏
freedom> /game stop
```

### 示例 5: 无头模式游戏会话

```bash
# 生产环境配置
freedom> /config set game.headless true
freedom> /config set automation.screenshots true
freedom> /config set logging.level warn

# 启动无头模式游戏
freedom> /game start --headless --timeout 45000

# 检查连接状态
freedom> /game status

# 查看截图（如果启用）
freedom> /debug log --filter screenshot
```

## 🔧 脚本管理示例

### 示例 6: 脚本基础操作

```bash
# 1. 查看所有可用脚本
freedom> /script list

# 输出示例：
# 📜 Available Scripts:
# 1. daily-tasks     │ Automated daily task completion
# 2. resin-check     │ Check current resin status  
# 3. domain-farm     │ Automated domain farming
# 4. event-tasks     │ Complete limited-time events

# 2. 运行脚本
freedom> /script run
# 选择: daily-tasks

# 3. 带参数运行脚本
freedom> /script run daily-tasks --args "resin_threshold=159" --timeout 120000

# 4. 创建新脚本
freedom> /script create my-custom-script --template basic

# 5. 编辑脚本
freedom> /script edit my-custom-script

# 6. 删除脚本
freedom> /script delete my-custom-script --confirm
```

### 示例 7: 调试模式脚本执行

```bash
# 启用调试日志
freedom> /config set logging.level debug

# 以调试模式运行脚本
freedom> /script run daily-tasks --debug --dry-run

# 查看执行日志
freedom> /debug log --level debug --tail 50 --filter script

# 监控执行性能
freedom> /debug monitor --watch
```

## 🔌 扩展管理示例

### 示例 8: 扩展完整管理流程

```bash
# 1. 查看已安装扩展
freedom> /extension list

# 2. 从注册表安装扩展
freedom> /extension install auto-resin-notifier --version latest

# 3. 从本地路径安装扩展
freedom> /extension install ./extensions/my-custom-extension --force

# 4. 启用扩展
freedom> /extension enable auto-resin-notifier

# 5. 配置扩展（如果支持）
freedom> /config set extensions.auto-resin-notifier.threshold 159
freedom> /config set extensions.auto-resin-notifier.webhook_url "https://example.com/webhook"

# 6. 查看扩展状态
freedom> /extension list --filter enabled

# 7. 禁用扩展
freedom> /extension disable auto-resin-notifier

# 8. 卸载扩展
freedom> /extension uninstall auto-resin-notifier --backup
```

### 示例 9: 扩展开发测试

```bash
# 1. 创建扩展开发环境
freedom> /extension create test-extension --typescript --template advanced

# 2. 本地安装开发中的扩展
freedom> /extension install ./extensions/test-extension --dev

# 3. 启用扩展
freedom> /extension enable test-extension

# 4. 测试扩展功能
freedom> /script run
# 选择扩展提供的脚本

# 5. 查看扩展日志
freedom> /debug log --filter extension:test-extension

# 6. 重新加载扩展（开发模式）
freedom> /extension reload test-extension

# 7. 验证扩展
freedom> /extension validate test-extension
```

## 🐛 调试和诊断示例

### 示例 10: 问题诊断流程

```bash
# 1. 系统整体检查
freedom> /debug doctor

# 2. 查看最近错误日志
freedom> /debug log --level error --tail 20

# 3. 实时监控系统状态
freedom> /debug monitor --watch --interval 5

# 4. 查看特定组件日志
freedom> /debug log --filter game --since "1 hour ago"

# 5. 检查配置正确性
freedom> /config validate

# 6. 清理临时文件
freedom> /debug cleanup --older-than 7 --confirm
```

### 示例 11: 性能优化检查

```bash
# 1. 性能基准测试
freedom> /debug benchmark --runs 5

# 2. 内存使用监控
freedom> /debug monitor --memory --duration 300

# 3. 脚本执行性能分析
freedom> /script run daily-tasks --profile --timeout 180000

# 4. 查看性能报告
freedom> /debug report --type performance --format json
```

## 💡 高级使用示例

### 示例 12: 批量操作

```bash
# 配置文件批量设置
freedom> /config import ./config-templates/gaming-setup.json

# 批量脚本执行
freedom> /script run-batch daily-tasks,resin-check,domain-farm --parallel

# 批量扩展管理
freedom> /extension install-batch ./extension-list.txt --enable-all
```

### 示例 13: 自动化工作流

```bash
# 1. 创建完整的游戏自动化工作流
freedom> /config set game.headless true
freedom> /config set automation.screenshots true
freedom> /config set logging.level info

# 2. 启动游戏会话
freedom> /game start --profile production

# 3. 等待游戏加载
freedom> /script run wait-for-game-ready --timeout 60000

# 4. 执行日常任务序列
freedom> /script run daily-complete-workflow

# 5. 生成执行报告
freedom> /debug report --type execution --export ./reports/

# 6. 清理和关闭
freedom> /game stop --cleanup
```

## 🔄 定期维护示例

### 示例 14: 系统维护流程

```bash
# 每日维护检查
freedom> /debug doctor --full
freedom> /config validate --fix-auto
freedom> /debug cleanup --logs --older-than 3

# 每周维护
freedom> /extension update-all --check-compatibility
freedom> /config backup --description "Weekly backup"
freedom> /debug report --type system --export ./maintenance/

# 每月维护
freedom> /debug cleanup --all --older-than 30
freedom> /config optimize --performance
freedom> /extension audit --security
```

## ❗ 错误处理示例

### 示例 15: 常见错误处理

```bash
# 游戏连接失败
freedom> /game start
# 如果失败：
freedom> /debug doctor --network
freedom> /config get game.url
freedom> /game start --timeout 120000 --retry 3

# 脚本执行失败
freedom> /script run daily-tasks
# 如果失败：
freedom> /debug log --level error --filter script
freedom> /script validate daily-tasks
freedom> /script run daily-tasks --safe-mode

# 扩展加载失败
freedom> /extension enable problematic-extension
# 如果失败：
freedom> /extension validate problematic-extension
freedom> /extension reinstall problematic-extension --force
freedom> /debug log --filter extension
```

## 📈 监控和报告示例

### 示例 16: 监控设置

```bash
# 设置持续监控
freedom> /debug monitor --watch --export ./monitoring/ --interval 10

# 在另一个终端运行游戏任务
freedom> /game start
freedom> /script run long-running-task

# 查看实时监控数据
freedom> /debug monitor --live --memory --cpu

# 生成监控报告
freedom> /debug report --type monitoring --period "last 24 hours"
```

这些示例涵盖了 Freedom CLI 的大部分功能，从基础操作到高级自动化工作流。建议从基础示例开始，逐步掌握更复杂的功能。

## 💡 小贴士

1. **使用 Tab 键自动补全命令和选项**
2. **使用 `--help` 查看任何命令的详细帮助**
3. **定期运行 `/debug doctor` 检查系统健康**
4. **使用 `/config backup` 在重要配置更改前备份**
5. **启用调试日志来排查问题**
6. **使用 `/extension list` 查看可用的扩展功能**

更多高级示例和最佳实践，请参考 [用户指南](../user-guide.md) 和 [开发者指南](../developer-guide.md)。