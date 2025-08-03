# Git 工作流指南

本文档描述了项目推荐的 Git 工作流程，旨在保持代码库的整洁和提高协作效率。

## 分支策略

### 主要分支

- `main`: 主分支，包含生产就绪的代码
- `develop`: 开发分支，包含最新的开发代码

### 功能分支

从 `develop` 分支创建，完成后合并回 `develop`：

- `feat/feature-name`: 新功能开发
- `fix/issue-description`: 修复问题
- `docs/update-description`: 文档更新
- `style/update-description`: 代码样式调整
- `refactor/component-name`: 代码重构
- `perf/performance-improvement`: 性能优化
- `test/test-description`: 测试相关
- `build/build-description`: 构建系统相关
- `ci/ci-description`: CI 配置相关
- `chore/task-description`: 其他任务

## 分支命名规范

1. 使用小写字母
2. 使用连字符（-）分隔单词
3. 简短但具有描述性
4. 避免使用下划线或其他特殊字符
5. 如果与 Issue 关联，可以包含 Issue 编号

示例：
- `feat/add-dark-mode`
- `fix/login-validation`
- `docs/update-api-docs`
- `refactor/auth-service`
- `fix/issue-123`

## 工作流程

### 1. 创建功能分支

```bash
# 确保本地 develop 分支是最新的
git checkout develop
git pull origin develop

# 创建并切换到新的功能分支
git checkout -b feat/your-feature-name
```

### 2. 开发功能

在功能分支上进行开发，并定期提交更改：

```bash
# 查看更改
git status

# 添加更改
git add .

# 提交更改（遵循提交规范）
git commit
```

### 3. 保持分支同步

定期将 `develop` 分支的更改合并到你的功能分支：

```bash
git checkout develop
git pull origin develop
git checkout feat/your-feature-name
git merge develop
```

如果有冲突，解决冲突后继续：

```bash
# 解决冲突后
git add .
git commit
```

### 4. 推送分支

```bash
git push origin feat/your-feature-name
```

### 5. 创建 Pull Request

在 GitHub/GitLab 上创建从你的功能分支到 `develop` 分支的 Pull Request。

Pull Request 应包含：
- 清晰的标题，遵循提交规范格式
- 对所做更改的详细描述
- 关联的 Issue 编号（如果有）
- 测试结果或截图（如果适用）

### 6. 代码审查

其他团队成员将审查你的代码，并可能提出修改建议。

根据反馈进行必要的修改：

```bash
# 进行修改
git add .
git commit
git push origin feat/your-feature-name
```

### 7. 合并 Pull Request

一旦 Pull Request 被批准，可以合并到 `develop` 分支：

- 使用 "Squash and merge" 选项将所有提交压缩为一个提交
- 确保最终的提交信息遵循提交规范

### 8. 删除功能分支

合并后，删除功能分支：

```bash
# 删除本地分支
git checkout develop
git branch -d feat/your-feature-name

# 删除远程分支
git push origin --delete feat/your-feature-name
```

## 版本发布流程

1. 从 `develop` 创建发布分支：

```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0
```

2. 在发布分支上进行最终测试和修复

3. 完成发布：

```bash
# 合并到 main
git checkout main
git merge release/v1.0.0

# 打标签
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0

# 合并回 develop
git checkout develop
git merge release/v1.0.0

# 删除发布分支
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

## 紧急修复流程

1. 从 `main` 创建热修复分支：

```bash
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-fix
```

2. 修复问题并提交

3. 完成热修复：

```bash
# 合并到 main
git checkout main
git merge hotfix/critical-bug-fix

# 打标签
git tag -a v1.0.1 -m "Hotfix: Critical bug fix"
git push origin v1.0.1

# 合并到 develop
git checkout develop
git merge hotfix/critical-bug-fix

# 删除热修复分支
git branch -d hotfix/critical-bug-fix
git push origin --delete hotfix/critical-bug-fix
```

## 最佳实践

1. **经常提交**：小而频繁的提交比大而不频繁的提交更好
2. **保持分支同步**：定期将 `develop` 合并到你的功能分支
3. **编写有意义的提交信息**：遵循项目的提交规范
4. **在合并前测试**：确保你的更改不会破坏现有功能
5. **使用 Pull Request**：即使是小的更改也应该通过 Pull Request 进行
6. **及时删除已合并的分支**：保持仓库整洁

## Git 配置建议

### 设置用户信息

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

### 设置默认编辑器

```bash
git config --global core.editor "code --wait"  # 使用 VS Code
```

### 设置别名

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
```

### 设置自动变基

```bash
git config --global pull.rebase true
```
