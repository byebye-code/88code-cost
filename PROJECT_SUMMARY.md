# 88Code Cost - 项目总结

## 项目概览

本项目是一个轻巧的浏览器扩展，用于监控 88code.org 网站的计费系统。项目基于 Plasmo 框架，使用 React + TypeScript + Tailwind CSS 构建，界面风格参考了 PackyCode Cost Monitor 项目。

## 核心功能

### ✅ 已实现功能

1. **API 服务层**
   - ✅ 对接 88Code Admin API 接口
   - ✅ 自动从 storage 读取 authToken
   - ✅ 自动添加 Authorization 请求头
   - ✅ 所有 API 响应打印到控制台

2. **数据展示**
   - ✅ 总体使用情况展示
   - ✅ 套餐列表展示
   - ✅ 每个套餐的额度和使用进度
   - ✅ 重置倒计时功能
   - ✅ 重置状态标识

3. **用户界面**
   - ✅ 现代化的 UI 设计
   - ✅ 响应式布局（460x600px）
   - ✅ 深色模式支持
   - ✅ 认证状态提示
   - ✅ 手动刷新功能
   - ✅ 加载状态显示
   - ✅ 错误提示

4. **开发工具**
   - ✅ Eruda 调试工具集成
   - ✅ 详细的控制台日志
   - ✅ 开发文档

## 技术架构

### 核心技术栈

```
Plasmo 0.90.5      - 浏览器扩展框架
React 18.2.0       - UI 框架
TypeScript 5.3.3   - 类型系统
Tailwind CSS 3.4   - 样式框架
Eruda 3.4.3        - 移动端调试工具
```

### 项目结构

```
88code-cost/
├── components/              # React 组件
│   ├── RefreshButton.tsx   # 刷新按钮
│   ├── SubscriptionCard.tsx # 套餐卡片
│   ├── UsageDisplay.tsx    # 使用情况显示
│   └── Skeleton.tsx        # 骨架屏组件
├── contents/                # Content Scripts（注入到网站页面）
│   ├── auth-handler.ts     # Token 获取 - 从网站 localStorage 读取
│   └── theme-sync.ts       # 主题同步 - 监听网站主题变化
├── hooks/                   # React Hooks
│   ├── useAuth.ts          # 认证管理
│   ├── useDashboard.ts     # Dashboard 数据（直接调用 API）
│   ├── usePaygoUsageStats.ts # PAYGO 用量统计
│   └── useSubscriptions.ts # 订阅数据（直接调用 API）
├── lib/                     # 工具库
│   ├── api/                # API 客户端
│   │   ├── config.ts       # API 配置
│   │   └── client.ts       # API 请求
│   └── storage/            # 存储管理
│       └── index.ts        # Storage 操作（包含缓存功能）
├── types/                   # TypeScript 类型
│   └── index.ts            # 类型定义
├── background.ts            # Background Service Worker（定时任务）
├── popup.tsx               # 主弹窗组件
├── package.json            # 项目配置
├── tsconfig.json           # TS 配置
├── tailwind.config.js      # Tailwind 配置
├── README.md               # 用户使用文档
├── CLAUDE.md               # Claude 开发指南（技术文档）
└── PROJECT_SUMMARY.md      # 项目总结
```

## API 集成详情

### 认证机制

```typescript
// 从 storage 读取 token
const authToken = await getAuthToken()

// 添加到请求头
headers["Authorization"] = `Bearer ${authToken}`
```

### 请求流程

1. popup 打开时触发数据获取
2. 从 storage 读取 authToken
3. 使用 authToken 创建 Authorization 头
4. 发送 API 请求
5. 响应数据打印到控制台
6. 更新 UI 显示

## 系统架构和数据流

### 三大核心组件

#### 1. Popup（用户界面）
- React 应用，显示套餐使用情况和统计数据
- **直接调用 API** 获取数据（Dashboard、Subscriptions、PAYGO 用量）
- 从 chrome.storage 读取缓存的 authToken
- 提供手动刷新和自动刷新（30秒）功能

#### 2. Content Script（网站数据访问）
- **注入位置**: `https://www.88code.org/*`
- **执行时机**: 页面加载完成后（`document_end`）
- **核心职责**:
  - 访问网站的 `localStorage` 读取 authToken 和主题设置
  - 响应来自 Background Worker 或 Popup 的消息请求
  - 监听网站主题变化并同步到扩展

**重要说明**: Content Script 是**唯一**能够访问网站 localStorage 的组件，Background Worker 和 Popup 都无法直接访问。

#### 3. Background Service Worker（后台任务调度）
- **核心职责**:
  1. **Token 同步协调**: 接收 Popup 请求，通过 `tabs.sendMessage` 调用 Content Script 获取 token
  2. **定时重置服务**: 每天 18:55 和 23:55 自动重置套餐额度
  3. **消息路由中心**: 在 Popup 和 Content Script 之间传递消息

**已移除的功能**:
- ~~定期数据获取~~ - 现在由 Popup 直接调用 API

### 完整数据流程图

#### Token 获取流程

```
用户打开 Popup
    ↓
Popup 调用 getAuthToken()
    ↓
尝试从 chrome.storage 读取缓存的 token
    ↓
chrome.storage 中有缓存？
    ├─ 是 → 直接使用缓存 token
    │         ↓
    │     返回 token 给 Popup
    │
    └─ 否 → 发送消息到 Background Worker
              ↓
          Background Worker 接收请求
              ↓
          使用 tabs.sendMessage 向 88code.org 标签页发送请求
              ↓
          Content Script (auth-handler.ts) 接收消息
              ↓
          Content Script 访问网站 localStorage 查找 token
              ↓ (搜索可能的 token 字段)
          localStorage.authToken / localStorage.token / ...
              ↓
          Content Script 返回 { authToken: "...", theme: "..." }
              ↓
          Background Worker 接收响应
              ↓
          缓存 token 到 chrome.storage (供后续使用)
              ↓
          返回 token 给 Popup
              ↓
          [如果所有步骤都失败] → 提示用户登录 88code.org
```

**Token 搜索策略** (`contents/auth-handler.ts`):
Content Script 会在 localStorage 中搜索以下可能的 token 字段：
- `authToken`
- `token`
- `accessToken`
- `access_token`
- `auth_token`
- `jwt`
- `jwtToken`
- `authorization`
- `bearer`

#### 数据刷新流程

```
用户点击刷新按钮 / 30秒自动刷新定时器触发
    ↓
调用 useDashboard.refresh() 和 useSubscriptions.refresh()
    ↓
直接调用 API 函数：fetchDashboard() / fetchSubscriptions()
    ↓
API 函数从 chrome.storage 读取缓存的 authToken
    ↓
构造 HTTP 请求（添加 Bearer Token 认证头）
    ↓
发送请求到 88code.org API
    ↓
接收 API 响应数据
    ↓
更新 React State（触发 UI 重新渲染）
    ↓
同时更新 chrome.storage 数据缓存（5分钟 TTL）
    ↓
UI 展示最新数据
```

**关键特性**:
- ✅ **不依赖 Background Worker** 进行数据获取
- ✅ **避免 Service Worker 挂起问题** - Service Worker 可能进入休眠状态导致消息传递失败
- ✅ **缓存优先策略** - 首次加载使用缓存（秒开），后台静默刷新
- ✅ **失败降级** - Token 获取失败时使用缓存，缓存也失败则提示登录

#### 主题同步流程

```
88code.org 网站主题变化
    ↓
Content Script (theme-sync.ts) 的 MutationObserver 检测到变化
    ↓
读取网站 localStorage.theme 或 document.documentElement.classList
    ↓
同步到 chrome.storage ("theme" key)
    ↓
Popup 从 chrome.storage 读取主题
    ↓
应用到扩展 UI（自动切换深色/浅色模式）
```

#### 定时重置流程

```
扩展启动 / 浏览器启动
    ↓
Background Worker 注册两个 chrome.alarms:
  - daily-reset-18:55 (下午 6:55)
  - daily-reset-23:55 (晚上 11:55)
    ↓
到达预定时间
    ↓
Alarm 触发 Background Worker
    ↓
调用 88code.org API 重置套餐额度
    ↓
清除相关缓存（dashboard_cache, subscriptions_cache）
    ↓
如果 Popup 打开，通知刷新 UI
    ↓
记录重置日志
```

### 组件通信关系

```
┌──────────────────────────────────────────────────────────────┐
│                     浏览器扩展生态                              │
│                                                                │
│  ┌──────────────┐      ┌──────────────┐      ┌─────────────┐ │
│  │    Popup     │◄────►│  Background  │◄────►│  Content    │ │
│  │  （前台界面）  │      │    Worker    │      │  Script     │ │
│  │              │      │  （协调中心）  │      │ （数据采集） │ │
│  └──────────────┘      └──────────────┘      └─────────────┘ │
│        ▲                      ▲                      ▲        │
│        │                      │                      │        │
│        │ 读取缓存              │ 定时任务               │ 注入   │
│        ▼                      ▼                      ▼        │
│  ┌────────────────────────────────────────────────────────┐  │
│  │          chrome.storage（扩展的存储空间）                 │  │
│  │          - authToken (缓存的 token)                     │  │
│  │          - theme (主题设置)                              │  │
│  │          - dashboard_cache (统计数据缓存，5分钟 TTL)      │  │
│  │          - subscriptions_cache (套餐数据缓存，5分钟 TTL)  │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                              │
                              │ Content Script 可以访问
                              ▼
                    ┌─────────────────────┐
                    │  88code.org 网站    │
                    │  - localStorage     │
                    │  - DOM 元素         │
                    │  - 网站主题         │
                    └─────────────────────┘
```

## 控制台输出

所有 API 请求和响应都会在控制台输出。

## 测试步骤

1. **安装依赖**
   ```bash
   pnpm install
   ```

2. **启动开发模式**
   ```bash
   pnpm dev
   ```

3. **加载扩展**
   - 打开 `chrome://extensions/`
   - 加载 `build/chrome-mv3-dev` 目录

4. **设置 authToken**
   - 方法 1: 在 88code.org 控制台设置
   - 方法 2: 临时硬编码到 `lib/storage/index.ts`

5. **测试功能**
   - 点击扩展图标
   - 查看 Eruda 控制台输出
   - 验证 API 响应数据

## 已完成的架构优化

### v1.0.2 架构重构

1. **✅ Token 获取流程优化**
   - 实现通过 Content Script 从网站 localStorage 自动读取 token
   - 添加 token 缓存机制（chrome.storage）
   - 实现失败降级策略（缓存 → 网站 → 提示登录）

2. **✅ 数据刷新架构优化**
   - 移除对 Background Worker 的数据获取依赖
   - Popup 直接调用 API（避免 Service Worker 挂起问题）
   - 实现 30 秒自动刷新 + 手动刷新
   - 添加 5 分钟数据缓存（TTL）

3. **✅ UI 加载优化**
   - 添加骨架屏加载效果（Skeleton components）
   - 缓存优先策略（秒开体验）
   - 优化加载状态提示

4. **✅ 主题同步**
   - 自动从 88code.org 网站同步主题
   - 实时监听网站主题变化（MutationObserver）
   - 深色/浅色模式自动切换

5. **✅ 定时重置服务**
   - 每天 18:55 和 23:55 自动重置
   - chrome.alarms 定时任务
   - 重置后自动刷新缓存

## 下一步开发建议

### 近期优化

1. **性能监控**
   - 添加 API 请求耗时统计
   - 监控 Content Script 注入成功率
   - 优化大数据量渲染性能

2. **错误处理增强**
   - 添加网络请求重试机制
   - 优化错误提示信息
   - 添加降级方案

3. **用户体验**
   - 添加数据加载进度指示
   - 优化空状态提示
   - 添加操作成功/失败反馈

### 长期规划

1. **数据分析**
   - 使用历史统计
   - 套餐使用趋势图
   - 成本预测和预警

2. **设置功能**
   - 刷新间隔自定义设置
   - 通知偏好设置
   - 手动主题切换开关

3. **多平台支持**
   - Firefox 扩展优化
   - Edge 扩展测试
   - Safari 扩展适配

## 注意事项

### 开发环境

- Node.js >= 16.x
- pnpm >= 8.x
- Chrome/Edge 浏览器

### API 依赖

- 需要有效的 authToken
- API 端点需要支持 CORS
- 响应格式需要符合类型定义

### 安全考虑

- authToken 存储在 local storage
- 不在代码中硬编码敏感信息
- 生产环境禁用 Eruda

## 相关文档

- [README.md](README.md) - 项目介绍和使用指南
- [DEVELOPMENT.md](DEVELOPMENT.md) - 详细的开发和测试指南
- [Plasmo 文档](https://docs.plasmo.com/) - 框架文档

## 维护者

88Code Team

## 许可证

MIT License

---

**项目状态**: ✅ 已完成基础功能开发，可以进行接口对接测试
