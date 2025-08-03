# 贡献指南

感谢你考虑为 Freedom 项目做出贡献！以下是参与贡献的指南，请仔细阅读。

## 目录

- [贡献指南](#贡献指南)
  - [目录](#目录)
  - [行为准则](#行为准则)
  - [如何贡献](#如何贡献)
    - [报告 Bug](#报告-bug)
    - [提出新功能](#提出新功能)
    - [提交代码](#提交代码)
    - [代码审查](#代码审查)
  - [开发流程](#开发流程)
    - [环境设置](#环境设置)
    - [分支管理](#分支管理)
    - [提交规范](#提交规范)
    - [测试](#测试)
  - [风格指南](#风格指南)
    - [代码风格](#代码风格)
    - [文档风格](#文档风格)
  - [其他资源](#其他资源)

## 行为准则

本项目采用贡献者公约（Contributor Covenant）作为其行为准则。我们期望所有参与者遵守这些准则：

- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注什么对社区最有利
- 对其他社区成员表示同理心

## 如何贡献

### 报告 Bug

如果你发现了 Bug，请使用 [Bug 报告模板](https://github.com/caterpi11ar/freedom/issues/new?template=bug_report.md) 创建一个 Issue。请确保：

- 使用清晰的标题描述问题
- 详细描述复现步骤
- 说明预期行为和实际行为
- 提供环境信息（操作系统、浏览器等）
- 如果可能，添加截图或代码片段

### 提出新功能

如果你有新功能的想法，请使用 [功能请求模板](https://github.com/caterpi11ar/freedom/issues/new?template=feature_request.md) 创建一个 Issue。请确保：

- 清晰描述你想要的功能
- 解释这个功能解决的问题
- 提供可能的实现方案
- 考虑这个功能的替代方案

### 提交代码

1. Fork 仓库
2. 创建你的功能分支：`git checkout -b feat/amazing-feature`
3. 提交你的更改：`git commit -m 'feat: add some amazing feature'`
4. 推送到分支：`git push origin feat/amazing-feature`
5. 提交 Pull Request

### 代码审查

所有的代码都需要通过代码审查才能被合并。代码审查的目的是：

- 确保代码质量
- 防止引入 Bug
- 确保代码符合项目风格
- 知识共享和学习

## 开发流程

### 环境设置

```bash
# 克隆仓库
git clone https://github.com/caterpi11ar/freedom.git
cd freedom

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

### 分支管理

请参考 [Git 工作流指南](https://github.com/caterpi11ar/freedom/blob/main/.github/docs/GIT_WORKFLOW.md) 了解我们的分支管理策略。

### 提交规范

请参考 [提交规范指南](https://github.com/caterpi11ar/freedom/blob/main/.github/docs/COMMIT_CONVENTION.md) 了解我们的提交信息格式要求。

### 测试

提交代码前，请确保：

- 所有测试都通过：`pnpm test`
- 代码符合 linting 规则：`pnpm lint`
- 类型检查通过：`pnpm typecheck`

## 风格指南

### 代码风格

- 使用 TypeScript 编写代码
- 遵循项目的 ESLint 和 Prettier 配置
- 编写清晰、可读的代码
- 添加适当的注释
- 使用有意义的变量和函数名

### 文档风格

- 使用 Markdown 格式
- 保持文档简洁明了
- 使用示例说明复杂概念
- 保持文档与代码同步更新

## 其他资源

- [项目文档](https://github.com/caterpi11ar/freedom/blob/main/README.md)
- [讨论区](https://github.com/caterpi11ar/freedom/discussions)

---

再次感谢你的贡献！❤️
