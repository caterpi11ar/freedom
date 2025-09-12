# `/systemconfig` 命令

系统配置管理，提供 Freedom CLI 的配置查看、修改和管理功能。

## 功能概述

系统配置管理允许用户查看和修改 Freedom CLI 的所有配置选项，包括界面设置、账户信息、功能开关等。

## 使用方式

```bash
/systemconfig
```

## 交互流程

### 主菜单

```
🔧 System Configuration Manager
Manage Freedom configuration settings

Available operations:
  1. List all configurations
  2. Get configuration value
  3. Set configuration value
  4. Reset configuration
  5. Exit

Select operation:
```

### 1. List all configurations

显示所有当前配置项：

```
📋 Current Configuration:
──────────────────────────────────────────────────

Settings:
  theme: light
  verbosity: normal
  interactive: true
  locale: zh-CN
  autoUpdate: false
  enableTelemetry: false

Accounts:
  defaultAccount: main_account
  configured accounts: 2
  accounts:
    main_account: cn region
    alt_account: cn region
```

### 2. Get configuration value

获取特定配置项的值：

```
Enter configuration key (e.g., settings.theme): settings.theme

✅ settings.theme: "light"
```

### 3. Set configuration value

修改配置项的值：

```
Enter configuration key (e.g., settings.theme): settings.theme
Enter configuration value: dark

✅ Configuration updated: settings.theme = "dark"
```

### 4. Reset configuration

重置所有配置到默认值：

```
Are you sure you want to reset all configuration to defaults? No

🚫 Reset cancelled
```

## 配置项详解

### Settings 配置

#### `settings.theme`
- **描述**: 界面主题设置
- **可选值**: `light` | `dark` | `auto`
- **默认值**: `light`
- **示例**: `/systemconfig` → 选择 "Set configuration value" → 输入 `settings.theme` → 输入 `dark`

#### `settings.cli.verbosity`
- **描述**: 命令行详细程度
- **可选值**: `silent` | `normal` | `verbose`
- **默认值**: `normal`
- **影响**: 控制输出信息的详细程度

#### `settings.cli.interactive`
- **描述**: 交互模式开关
- **可选值**: `true` | `false`
- **默认值**: `true`
- **影响**: 控制是否启用交互式界面

#### `settings.cli.locale`
- **描述**: 语言地区设置
- **可选值**: `zh-CN` | `en-US` | 其他语言代码
- **默认值**: `zh-CN`
- **影响**: 界面显示语言

#### `settings.features.autoUpdate`
- **描述**: 自动更新功能
- **可选值**: `true` | `false`
- **默认值**: `false`
- **影响**: 是否自动检查和安装更新

#### `settings.features.enableTelemetry`
- **描述**: 遥测数据收集
- **可选值**: `true` | `false`
- **默认值**: `false`
- **影响**: 是否发送使用数据用于改进

#### `settings.features.allowRemoteControl`
- **描述**: 远程控制功能
- **可选值**: `true` | `false`
- **默认值**: `false`
- **影响**: 是否允许远程控制（安全功能）

### Accounts 配置

#### `accounts.defaultAccount`
- **描述**: 默认使用的账户
- **可选值**: 已配置账户的名称
- **默认值**: `undefined`
- **影响**: 新任务默认使用的账户

#### `accounts.accounts.*`
- **描述**: 账户详细配置
- **结构**:
  ```md
  {
    "apiKey": "string",
    "region": "cn" | "global",
    "username": "string (可选)",
    "lastLoginTime": "ISO时间字符串 (可选)"
  }
  ```

## 环境变量支持

系统支持通过环境变量覆盖配置：

| 环境变量 | 配置路径 | 示例值 |
|----------|----------|--------|
| `FREEDOM_THEME` | `settings.theme` | `dark` |
| `FREEDOM_VERBOSE` | `settings.cli.verbosity` | `verbose` |
| `FREEDOM_API_KEY` | 自动创建默认账户 | `your-api-key` |
| `FREEDOM_AUTO_UPDATE` | `settings.features.autoUpdate` | `true` |
| `FREEDOM_TELEMETRY` | `settings.features.enableTelemetry` | `false` |
| `FREEDOM_LOCALE` | `settings.cli.locale` | `en-US` |

## 配置文件位置

### 用户级配置
- **Windows**: `%APPDATA%/Freedom/settings.json`, `%APPDATA%/Freedom/accounts.json`
- **macOS/Linux**: `~/.freedom/settings.json`, `~/.freedom/accounts.json`

### 项目级配置
- 项目根目录: `./.freedom/settings.json`, `./.freedom/accounts.json`
- 可选位置: `./freedom.settings.json`, `./freedom.accounts.json`

## 配置优先级

配置项按以下优先级合并（从低到高）：

1. **内置默认值** - 硬编码的默认配置
2. **用户级配置** - `~/.freedom/` 目录下的配置文件
3. **项目级配置** - 项目目录下的配置文件
4. **环境变量** - 通过环境变量设置的值

## 配置验证

所有配置都会通过 Zod 模式验证：

```md
// Settings 验证规则
{
  theme: "light" | "dark" | "auto",
  features: {
    autoUpdate: boolean,
    enableTelemetry: boolean,
    allowRemoteControl: boolean
  },
  cli: {
    verbosity: "silent" | "normal" | "verbose",
    interactive: boolean,
    locale: string
  }
}
```

## 高级功能

### 批量配置
通过项目配置文件进行批量设置：

```json
{
  "settings": {
    "theme": "dark",
    "cli": {
      "verbosity": "verbose"
    }
  },
  "accounts": {
    "defaultAccount": "work_account"
  }
}
```

### 配置备份
- 配置文件自动备份
- 支持手动导出配置
- 配置恢复功能

### 团队配置
- 项目级配置便于团队共享
- 环境变量适用于CI/CD
- 敏感信息分离存储

## 相关命令

- [`/log`](../log/README.md) - 查看配置变更日志

## 注意事项

1. **权限要求**: 修改配置需要相应的文件写入权限
2. **配置验证**: 无效配置值会被拒绝并显示错误
3. **立即生效**: 大部分配置修改会立即生效，部分需要重启
4. **安全性**: 敏感配置（如API密钥）会被加密存储
5. **备份建议**: 重要配置修改前建议先备份

## 故障排除

### 配置文件损坏
如果配置文件损坏，可以：
1. 使用重置功能恢复默认配置
2. 手动删除配置文件让系统重新创建
3. 从备份恢复配置文件

### 权限问题
如果遇到权限错误：
1. 检查配置目录的读写权限
2. 以管理员身份运行（Windows）
3. 修改文件所有者（macOS/Linux）

### 配置不生效
如果配置修改不生效：
1. 检查是否有环境变量覆盖
2. 确认配置文件格式正确
3. 重启 CLI 应用程序
