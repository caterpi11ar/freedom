# Freedom 配置管理系统

**位置**: `@freedom/shared/config`

## 1. 模块化配置设计

通用配置系统，作为项目的核心基础设施，可被多个包共享使用。

* **核心目标**

  1. 提供一致的读写接口，屏蔽底层存储细节。
  2. 支持多种配置文件（如 `settings.json`、`accounts.json`、`plugins.json`）。
  3. 支持环境变量注入与默认值回退。
  4. 提供 Schema 验证，保证配置安全与可扩展。

* **典型配置文件**

  * `~/.freedom/settings.json` —— CLI 行为配置
  * `~/.freedom/accounts.json` —— 账号与鉴权配置
  * `<project-root>/.freedom/settings.json` —— 项目级配置
  * `<project-root>/.freedom/accounts.json` —— 项目级账号配置（可选）

---

## 2. 配置优先级（从低到高）

1. CLI 内置默认值（hard-coded defaults）
2. 用户级配置（`~/.freedom/*.json`）
3. 项目级配置（`<project>/.freedom/*.json`）
4. 环境变量（`.env` 和 `process.env`）
5. 命令行参数（flags）

最终在 CLI 启动时合并为一个 **内存中的配置对象（in-memory config）**。

---

## 3. 架构设计

### 抽象基类设计

定义了一个 **配置抽象层** `BaseConfigManager`，不同配置模块基于此扩展。

#### 抽象职责

1. **load**：加载配置（文件 + 环境变量 + 默认值）
2. **validate**：通过 `zod` 校验 Schema
3. **merge**：按优先级合并多层配置
4. **get/set**：在运行时读写配置（in-memory + 文件持久化）
5. **persist**：将修改写回对应 JSON 文件

#### 实现类

* `SettingsManager`：管理 CLI 行为相关配置（主题、功能开关等）。
* `AccountsManager`：管理账号配置（API Key、多账户信息等）。
* `ConfigManager`：统一配置管理器，协调各个子管理器

### 模块结构

```
packages/shared/src/config/
├── README.md              # 配置管理规范
├── types.ts               # 配置类型定义
├── schemas/               # 配置验证模式
│   ├── settings.ts        # CLI 行为配置模式
│   ├── accounts.ts        # 账户配置模式
│   └── index.ts           # 模式导出
├── managers/              # 配置管理器
│   ├── BaseConfigManager.ts   # 抽象基类
│   ├── SettingsManager.ts     # 设置管理器
│   ├── AccountsManager.ts     # 账户管理器
│   ├── ConfigManager.ts       # 统一管理器
│   └── index.ts               # 管理器导出
├── defaults/              # 默认配置
│   ├── settings.ts        # 默认设置配置
│   ├── accounts.ts        # 默认账户配置
│   └── index.ts           # 默认值导出
├── utils/                 # 配置工具函数
│   ├── paths.ts           # 配置路径管理
│   ├── validation.ts      # 验证工具
│   ├── merge.ts           # 配置合并工具
│   └── index.ts           # 工具导出
└── index.ts               # 主入口
```

---

## 4. 使用方式

### 基本用法

```typescript
import { configManager, getConfig, setConfigValue } from '@freedom/shared/config'

// 获取完整配置
const config = await getConfig()

// 获取特定配置值
const theme = await getConfigValue('settings.theme')

// 设置配置值
await setConfigValue('settings.theme', 'dark')

// 使用管理器实例
await configManager.load()
const currentConfig = configManager.getConfig()
```

### 专用管理器

```typescript
import { AccountsManager, SettingsManager } from '@freedom/shared/config'

// 设置管理器
const settingsManager = new SettingsManager()
await settingsManager.load()
const theme = settingsManager.get('theme')
await settingsManager.set('theme', 'dark')

// 账户管理器
const accountsManager = new AccountsManager()
await accountsManager.load()
const accounts = accountsManager.get('accounts')
```

---

## 5. 配置文件示例

### CLI 配置 (`~/.freedom/settings.json`)

```json
{
  "theme": "dark",
  "features": {
    "autoUpdate": true
  },
  "cli": {
    "verbosity": "verbose",
    "interactive": true,
    "locale": "zh-CN"
  }
}
```

### 账号配置 (`~/.freedom/accounts.json`)

```json
{
  "defaultAccount": "work",
  "accounts": {
    "work": {
      "apiKey": "work-api-key-123",
      "region": "cn",
      "username": "work@example.com"
    },
    "personal": {
      "apiKey": "personal-api-key-456",
      "region": "global",
      "username": "personal@example.com"
    }
  }
}
```

### 环境变量 (`.env`)

```env
FREEDOM_API_KEY=env-api-key-xyz
FREEDOM_THEME=dark
FREEDOM_VERBOSE=verbose
```

---

## 6. Schema 验证

每个配置模块都有对应的 Zod Schema：

### Settings Schema

```typescript
export const SettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto']).default('light'),
  features: z.object({
    autoUpdate: z.boolean().default(false),
    enableTelemetry: z.boolean().default(false),
    allowRemoteControl: z.boolean().default(false),
  }).default({}),
  cli: z.object({
    verbosity: z.enum(['silent', 'normal', 'verbose']).default('normal'),
    interactive: z.boolean().default(true),
    locale: z.string().default('zh-CN'),
  }).default({})
})
```

### Accounts Schema

```typescript
export const AccountsSchema = z.object({
  defaultAccount: z.string().optional(),
  accounts: z.record(
    z.string(),
    z.object({
      apiKey: z.string(),
      region: z.enum(['cn', 'global']).default('cn'),
      username: z.string().optional(),
      lastLoginTime: z.string().optional(),
    }),
  ).default({}),
})
```

---

## 7. 扩展指南

### 添加新配置类型

1. 在 `schemas/` 中定义新的 Schema
2. 在 `defaults/` 中定义默认值
3. 创建对应的 Manager 类继承 `BaseConfigManager`
4. 更新主 Schema 和类型定义
5. 在主 `ConfigManager` 中集成新管理器

### 自定义管理器

```typescript
import { BaseConfigManager } from '@freedom/shared/config'

export class CustomConfigManager extends BaseConfigManager<CustomConfig> {
  async load(): Promise<void> {
    // 实现加载逻辑
  }

  validate(config: unknown): CustomConfig {
    // 实现验证逻辑
  }

  // ... 其他必需方法
}
```

---

## 8. 迁移指南

从旧版本迁移到新的模块化配置系统：

1. 更新导入路径：
   ```typescript
   // 新版本
   import { getConfig } from '@freedom/shared/config'

   // 旧版本
   import { getConfig } from '../config/config.js'
   ```

2. API 保持兼容，无需修改使用方式

3. 配置文件格式保持不变

---

## 9. 总结

* **模块化管理**：配置系统作为共享基础设施
* **多配置文件支持**：`settings.json`、`accounts.json`，易于扩展
* **抽象接口职责**：`load`、`validate`、`merge`、`get/set`、`persist`
* **运行时机制**：统一在启动时构建内存对象，运行时共享，修改时写回文件
* **核心工具**：`cosmiconfig`（发现）、`dotenv`（环境变量）、`zod`（验证）、`conf`（写入）
* **类型安全**：完整的 TypeScript 类型支持和验证
