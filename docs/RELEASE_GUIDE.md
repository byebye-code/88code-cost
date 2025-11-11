# 88Code Cost - 发布指南

## 快速发布 v1.0.2

本版本包含架构重构、性能优化和用户体验改进。

### 1. 提交代码

```bash
# 添加所有修改的文件
git add .

# 提交更改
git commit -m "chore: release v1.0.2

架构重构、性能优化和用户体验改进"
```

### 2. 打标签并推送

```bash
# 创建带注释的 tag
git tag -a v1.0.2 -m "Release v1.0.2

🎉 重大更新

本版本包含架构重构、性能优化和用户体验改进。

✨ 新功能：
- 操作反馈系统（手动重置、自动重置切换成功提示）
- PAYGO 套餐卡片布局优化
- 改进 PAYGO 套餐数据提示准确性

⚡ 性能优化：
- 手动重置刷新延迟：1500ms → 800ms（提升 47%）
- 定时重置立即执行（移除随机延迟）
- 防重复刷新保护
- 定时重置优化（Alarms API + 5小时冷却）

🏗️ 架构重构：
- 合并双 Background Worker
- 新增单元测试框架（Vitest）
- 代码模块化
- 依赖升级

🐛 Bug 修复：
- 修复认证同步问题
- 统一图标管理
- 代码清理

详细变更日志: RELEASE_v1.0.2_DESCRIPTION.md"

# 推送代码和标签
git push origin master
git push origin v1.0.2
```

### 3. 自动发布

推送标签后，GitHub Actions 会自动：
1. 构建 Chrome/Firefox/Edge 三个平台版本
2. 创建 GitHub Release
3. 上传构建产物（ZIP 包）
4. 使用 tag 注释作为 Release 说明

### 4. 验证发布

访问：`https://github.com/your-username/88code-cost/releases/tag/v1.0.2`

确认：
- Release 已创建 ✅
- 包含 3 个 ZIP 文件 ✅
- Release 说明正确显示 ✅

## 版本号规范

遵循语义化版本：`MAJOR.MINOR.PATCH`

- **v1.0.2**: 补丁版本（Bug 修复、性能优化、架构重构）
- **v1.1.0**: 次版本（新功能）
- **v2.0.0**: 主版本（重大更新、不兼容变更）

## 发布检查清单

发布前确认：

- [ ] 所有优化已实现并测试
- [ ] 本地构建成功：`pnpm build:all`
- [ ] TypeScript 检查通过
- [ ] 扩展在浏览器中正常运行
- [ ] 版本号已更新（如需要）
- [ ] CHANGELOG.md 已更新（如需要）

## 紧急回滚

如果发布后发现严重问题：

```bash
# 删除远程标签
git push origin --delete v1.0.2

# 删除本地标签
git tag -d v1.0.2

# 删除 GitHub Release（或在网页上手动删除）
gh release delete v1.0.2

# 回滚代码（如需要）
git revert HEAD
git push origin master
```

## 常见问题

**Q: GitHub Actions 未触发？**
- 确认标签格式正确（必须以 `v` 开头）
- 检查 `.github/workflows/release.yml` 是否存在
- 查看 Actions 页面的错误日志

**Q: 构建失败？**
- 检查 `pnpm build:all` 是否本地成功
- 查看 Actions 日志的具体错误
- 确认所有依赖已正确安装

**Q: Release 说明显示不正确？**
- 使用 `-a` 创建带注释的标签
- 确保注释格式正确（Markdown 支持）
- 可以在 GitHub 上手动编辑 Release 说明
