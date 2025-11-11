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

## [1.0.2] - 2025-01-12

### 新增
- ✨ 操作反馈系统
  - 手动重置后显示成功提示（3 秒自动消失）
  - 自动重置开关切换后显示状态反馈
- ✨ PAYGO 套餐 UI 优化
  - 移除冗余的"基于最近 X 天"文字
  - 余额卡改为精简单行设计
  - 进度条高度提升 40%，可视性更好
  - 整体布局更紧凑协调
- ✨ 改进 PAYGO 套餐数据提示准确性
  - 区分三种状态：无数据、数据不足、无消耗
  - 明确显示需要的最少天数
- 🧪 新增完整的单元测试框架（Vitest）
  - reset-strategy.test.ts - 重置策略测试
  - token.test.ts - Token 工具测试

### 优化
- ⚡ 手动重置刷新延迟：1500ms → 800ms（提升 47%）
- ⚡ 定时重置立即执行（移除 0-15 秒随机延迟）
- ⚡ 防重复刷新保护（使用 Promise.all 并行处理，避免并发请求导致数据不一致）
- ⚡ 定时重置系统优化
  - 使用 Chrome Alarms API 替代 setInterval，即使 Service Worker 挂起也能可靠执行
  - 引入时间窗口机制，精确追踪重置状态
  - 冷却时间从 24 小时优化为 5 小时

### 架构重构
- 🏗️ 合并双 Background Worker 为单个统一文件
  - 整合数据预取服务（每 30 秒）
  - 整合定时重置服务（18:55 和 23:55）
- 🔧 提取重置策略为独立服务模块（reset-strategy.ts）
- 🔑 统一 Token 管理（token.ts 工具类）
- 📝 统一日志系统（logger.ts）
  - 自动根据环境变量控制输出
  - 预配置的日志实例
- ⬆️ 依赖升级
  - Plasmo 框架升级到 0.90.5
  - React 升级到 18.2
  - TypeScript 升级到 5.3

### 修复
- 🔐 修复用户重新登录后扩展使用旧 token 导致认证失败的问题
  - 优先从网站 localStorage 读取最新 token
  - 扩展 storage 缓存仅作为降级方案
  - 自动同步最新 token 到缓存
- 🖼️ 统一图标管理，删除 9 个冗余图标文件
  - 统一使用 assets/logo.png
  - 在 package.json 显式配置所有尺寸
- 🧹 代码清理
  - 删除 data-fetch.ts 和 scheduled-reset.ts（已合并）
  - 移除代码中的表情符号，统一使用文本标记
  - 简化认证处理代码从 ~150 行到 ~60 行

### 文档
- 📚 新增发布指南（docs/RELEASE_GUIDE.md）
- 📚 更新开发文档（DEVELOPMENT.md）
- 📚 更新目录结构说明

### 统计数据
- 新增代码：+929 行
- 删除代码：-490 行
- 净增长：+439 行
- 提交次数：6 次

## [1.0.1] - 2025-11-09

### 新增
- ✨ 定时重置倒计时提醒（18:55 和 23:55 前 3 分钟展示）
- 🔍 智能定时重置条件检查（重置次数、额度状态、冷却时间）
- 🎯 PAYGO 套餐差异化处理（隐藏重置相关功能）
- ⏱️ 实时倒计时秒数显示，更精确直观

### 优化
- 🎨 倒计时卡片采用蓝紫渐变配色，视觉更专业
- 📐 紧凑型布局设计，减小内边距提升空间利用率
- 💡 光效背景增强视觉层次感

### 技术改进
- 🏗️ 新增 `useScheduledResetCountdown` Hook 统一管理倒计时状态
- 🛠️ 新增 `scheduledReset` 服务模块处理定时重置逻辑
- 📊 完善的重置条件验证机制

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

[Unreleased]: https://github.com/yourusername/88code-cost/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/yourusername/88code-cost/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/yourusername/88code-cost/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/yourusername/88code-cost/releases/tag/v1.0.0
