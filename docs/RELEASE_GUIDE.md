# 88Code Cost - 发布指南

## 快速发布 v1.0.1

本次更新包含 6 项性能和用户体验优化。

### 1. 提交代码

```bash
# 添加所有修改的文件
git add components/SubscriptionCard.tsx hooks/useResetWindowTracker.ts hooks/usePaygoUsageStats.ts popup.tsx

# 提交更改
git commit -m "feat: 优化用户体验和性能

- 移除定时重置的随机延迟，改为立即执行
- 添加手动重置和自动重置切换的成功反馈消息
- 优化 PAYGO 无数据提示，区分数据不足与无消耗
- 减少手动重置延迟从 1500ms 到 800ms
- 添加防重复刷新保护，防止并发请求"
```

### 2. 打标签并推送

```bash
# 创建带注释的 tag
git tag -a v1.0.1 -m "Release v1.0.1

🎉 优化更新

✨ 新功能：
- 添加操作成功反馈消息（手动重置、自动重置切换）
- 改进 PAYGO 套餐数据提示的准确性

⚡ 性能优化：
- 移除定时重置随机延迟（0-15秒），改为立即执行
- 手动重置刷新延迟从 1500ms 优化到 800ms
- 添加防重复刷新保护，避免并发请求导致的数据不一致

📝 详细变更：
1. useResetWindowTracker: 移除随机延迟，使用 IIFE 立即执行
2. SubscriptionCard: 添加成功消息状态和 3 秒自动消失
3. SubscriptionCard: 细化 PAYGO 无数据提示（无数据/数据不足/无消耗）
4. SubscriptionCard: 优化刷新延迟到 800ms
5. popup: 添加 isRefreshing 状态防止重复刷新
6. usePaygoUsageStats: 暴露 refresh 函数支持手动刷新"

# 推送代码和标签
git push origin master
git push origin v1.0.1
```

### 3. 自动发布

推送标签后，GitHub Actions 会自动：
1. 构建 Chrome/Firefox/Edge 三个平台版本
2. 创建 GitHub Release
3. 上传构建产物（ZIP 包）
4. 使用 tag 注释作为 Release 说明

### 4. 验证发布

访问：`https://github.com/your-username/88code-cost/releases/tag/v1.0.1`

确认：
- Release 已创建 ✅
- 包含 3 个 ZIP 文件 ✅
- Release 说明正确显示 ✅

## 版本号规范

遵循语义化版本：`MAJOR.MINOR.PATCH`

- **v1.0.1**: 补丁版本（Bug 修复、小优化）
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
git push origin --delete v1.0.1

# 删除本地标签
git tag -d v1.0.1

# 删除 GitHub Release（或在网页上手动删除）
gh release delete v1.0.1

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
