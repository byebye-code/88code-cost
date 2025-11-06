# 88Code Cost

<div align="center">
  <p>智能额度监控工具，实时追踪套餐使用情况并自动重置。</p>

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat&logo=google-chrome&logoColor=white)

</div>

## ✨ 功能特性

### 📊 核心功能

- 📈 **实时监控**: 查看总体使用情况和各套餐额度
- 💰 **套餐跟踪**: 可视化显示每个套餐的使用进度
- 🤖 **智能重置**: 18:55/23:55 自动重置，最大化利用重置窗口
- 🔄 **重置倒计时**: 自动计算并显示套餐重置时间
- 🔒 **安全认证**: 自动从 88code.org 读取认证 Token

### 💎 用户体验

- 🎨 **现代 UI**: 基于 Tailwind CSS 的现代化界面设计
- ⚡ **轻量级**: 基于 Plasmo 框架，高性能低内存占用
- 📱 **响应式**: 460x600px 的精致弹窗设计
- 🔄 **即时刷新**: 支持手动刷新获取最新数据

## 🚀 快速开始

### 开发环境设置

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

开发模式下，在浏览器中加载 `build/chrome-mv3-dev` 目录。

### 构建生产版本

```bash
pnpm build
```

构建完成后，可以在 `build/` 目录中找到生产版本。

## 🛠️ 技术栈

- **框架**: [Plasmo](https://docs.plasmo.com/) - 现代浏览器扩展开发框架
- **UI 库**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Plasmo Storage API
- **构建工具**: Plasmo CLI
- **代码质量**: ESLint + Prettier

## 📖 使用指南

### 基础使用

1. **安装扩展**: 在浏览器中加载构建好的扩展
2. **访问网站**: 访问 [88code.org](https://www.88code.org) 并登录
3. **查看监控**: 点击扩展图标即可查看套餐使用情况

### API 接口

扩展对接 88Code Admin API，自动添加 `Authorization: Bearer {token}` 认证头部。

## 📁 项目结构

```
88code-cost/
├── components/          # React 组件
│   ├── SubscriptionCard.tsx
│   ├── UsageDisplay.tsx
│   └── RefreshButton.tsx
├── hooks/              # React Hooks
│   ├── useAuth.ts
│   ├── useSubscriptions.ts
│   └── useDashboard.ts
├── lib/                # 工具库
│   ├── api/           # API 客户端
│   └── storage/       # 存储管理
├── types/             # TypeScript 类型定义
├── popup.tsx          # 主弹窗组件
├── package.json       # 项目配置
└── README.md         # 项目文档
```

## 🔧 开发说明

### 认证机制

扩展会自动从 88code.org 网站的 storage 中读取 `authToken`，并将其作为 API 请求的认证头：

```typescript
Authorization: Bearer {authToken}
```

### 数据刷新

- 扩展打开时自动获取数据
- 可通过刷新按钮手动更新
- 所有 API 响应都会打印到控制台方便调试

### 调试

开发模式下会自动启用 Eruda 调试工具，可以在扩展中查看控制台输出和网络请求。

## 📝 更新日志

### v1.0.0 (2025-11-05)

- 🎉 **首个版本发布**
- 📊 **基础功能**: 套餐监控、使用情况展示
- 🔄 **重置倒计时**: 自动计算套餐重置时间
- 🎨 **现代界面**: 基于 Tailwind CSS 的美观界面

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 🔗 相关链接

- [88Code 官网](https://www.88code.org)
- [Plasmo 文档](https://docs.plasmo.com/)
- [Chrome Extension 开发指南](https://developer.chrome.com/docs/extensions/)

---

<div align="center">
  <p>如果这个项目对您有帮助，请给我们一个 ⭐️</p>
</div>
