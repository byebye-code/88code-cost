# 更新日志

所有重要的项目变更都将记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### 计划中
- 自定义重置时间功能
- 多语言支持（中文/English）
- 套餐使用统计图表
- 通知提醒功能

## [1.0.0] - 2025-11-07

### 新增
- ✨ 实时套餐监控功能
- ✨ 智能定时重置（18:55 智能策略 + 23:55 兜底策略）
- ✨ 深色模式支持（浅色/深色/跟随88code）
- ✨ 自动刷新（30秒间隔）和手动刷新
- ✨ 重置倒计时显示
- ✨ 可视化进度条
- ✨ 跨浏览器支持（Chrome / Firefox / Edge）

### 用户体验
- 🎨 现代化 UI 设计
- ⚡ 骨架屏加载优化
- 💬 友好的错误提示
- 📱 响应式布局
- 🔄 智能缓存机制（5分钟 TTL）

### 技术实现
- 🏗️ 基于 Plasmo v0.90.5 框架
- ⚛️ React 18.2.0 + TypeScript 5.3.3
- 🎨 Tailwind CSS 3.4 + shadcn/ui
- 🔐 安全的本地存储
- 🌐 Chrome MV3 / Firefox MV2 兼容

### 安全性
- 🔒 所有数据本地存储
- 🔑 安全的 Token 认证
- 🛡️ 最小权限原则
- 📖 完整开源透明

---

## 版本说明

### 语义化版本格式
- **主版本号（Major）**：不兼容的 API 修改
- **次版本号（Minor）**：向下兼容的功能性新增
- **修订号（Patch）**：向下兼容的问题修正

### 更新类型
- **新增（Added）**：新功能
- **变更（Changed）**：既有功能的变更
- **弃用（Deprecated）**：即将移除的功能
- **移除（Removed）**：已移除的功能
- **修复（Fixed）**：任何问题修复
- **安全（Security）**：安全相关的修复

---

[Unreleased]: https://github.com/yourusername/88code-cost/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/88code-cost/releases/tag/v1.0.0
