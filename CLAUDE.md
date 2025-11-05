# 88Code Cost Monitor - Claude 开发指南

## 项目概述

88Code Cost Monitor 是一个基于 Plasmo 框架开发的 Chrome 浏览器扩展，用于实时监控 88code.org 平台的套餐使用情况和额度。

## 技术栈

- **框架**: Plasmo v0.90.5 (Chrome MV3)
- **UI**: React 18.2.0 + TypeScript 5.3.3
- **样式**: Tailwind CSS 3.4
- **调试**: Eruda 3.4.3 (开发环境)
- **状态管理**: Plasmo Storage API
- **包管理**: pnpm

## 项目结构

```
88code-cost/
├── assets/                  # 静态资源
│   ├── icon*.png           # 扩展图标（多尺寸）
│   └── logo.png            # Logo
├── components/             # React 组件
│   ├── RefreshButton.tsx   # 刷新按钮组件
│   ├── Skeleton.tsx        # 骨架屏组件
│   ├── SubscriptionCard.tsx # 套餐卡片组件
│   └── UsageDisplay.tsx    # 使用情况显示组件
├── hooks/                  # React Hooks
│   ├── useAuth.ts          # 认证状态管理
│   ├── useDashboard.ts     # Dashboard 数据管理（带缓存）
│   └── useSubscriptions.ts # 订阅数据管理（带缓存）
├── lib/                    # 工具库
│   ├── api/
│   │   ├── client.ts       # API 客户端
│   │   └── config.ts       # API 配置
│   └── storage/
│       └── index.ts        # Storage 管理（包含缓存功能）
├── types/
│   └── index.ts            # TypeScript 类型定义
├── popup.tsx               # 主弹窗入口
└── reset.css               # CSS 重置样式

```

## 核心功能

### 1. 认证系统 (useAuth)

- 自动从 chrome.storage 读取 authToken
- 验证 token 有效性
- 支持 Bearer token 认证

### 2. 数据缓存系统

实现了 5 分钟 TTL 缓存机制：

```typescript
// lib/storage/index.ts
export async function setCacheData<T>(key: string, data: T): Promise<void>
export async function getCacheData<T>(key: string, maxAge?: number): Promise<T | null>
```

**缓存策略**：
- 首次加载：优先使用缓存数据（如果存在且未过期）
- 手动刷新：强制重新获取最新数据
- 缓存时长：5分钟（300000ms）

### 3. API 集成

**端点配置** (`lib/api/config.ts`):
```typescript
export const API_ENDPOINTS = {
  LOGIN_INFO: "/admin-api/cc-admin/system/user/loginInfo",
  DASHBOARD: "/admin-api/cc-admin/system/usage/dashboard",
  SUBSCRIPTIONS: "/admin-api/cc-admin/system/subscription/my"
}
```

**认证处理**:
```typescript
headers["authorization"] = `Bearer ${authToken}`
```

### 4. 数据过滤规则

**订阅过滤** (`lib/api/client.ts:113-116`):
```typescript
result.data = result.data.filter(
  (sub) => sub.subscriptionStatus === "活跃中" && sub.isActive === true
)
```

只显示同时满足以下条件的套餐：
- `subscriptionStatus === "活跃中"`
- `isActive === true`

### 5. 加载优化

**骨架屏** (`components/Skeleton.tsx`):
- UsageDisplaySkeleton - 使用情况骨架屏
- SubscriptionCardSkeleton - 套餐卡片骨架屏
- 使用 Tailwind 的 `animate-pulse` 实现动画效果

**加载逻辑** (`popup.tsx`):
1. 打开 popup 时自动触发数据加载
2. 优先展示缓存数据（如果存在）
3. 无缓存时显示骨架屏
4. 数据加载完成后更新 UI

## 开发工作流

### 环境设置

```bash
# 安装依赖
pnpm install

# 启动开发模式
pnpm dev

# 构建生产版本
pnpm build
```

### 加载扩展

1. 打开 Chrome: `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 `build/chrome-mv3-dev` 目录

### 调试

**开发环境自动启用 Eruda**:
- Console: 查看日志
- Network: 查看 API 请求
- Storage: 查看 authToken 和缓存数据
- Elements: 查看 DOM 结构

**控制台日志**:
```javascript
[Popup] 开始加载数据
[Dashboard] 使用缓存数据
[Subscriptions] 使用缓存数据
[API] 请求: GET https://www.88code.org/admin-api/...
[API] 请求成功
```

## API 数据类型

### LoginInfo
```typescript
interface LoginInfo {
  userId: string
  username: string
  email: string
  // ...
}
```

### DashboardData
```typescript
interface DashboardData {
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  // ...
}
```

### Subscription
```typescript
interface Subscription {
  id: string
  name: string
  subscriptionStatus: string  // "活跃中" | 其他状态
  isActive: boolean
  totalCredits: number
  usedCredits: number
  resetDate: string
  // ...
}
```

## 性能优化

### 1. 数据缓存
- 5分钟缓存避免频繁请求
- 缓存 key: `dashboard_cache`, `subscriptions_cache`
- 使用 Plasmo Storage API 持久化

### 2. 加载体验
- 骨架屏占位，避免白屏
- 缓存优先策略，快速展示上次数据
- 后台静默刷新

### 3. 过滤优化
- 客户端过滤非活跃订阅
- 减少 UI 渲染负担

## 常见问题

### 1. 认证失败

**检查**:
1. 访问 88code.org 并登录
2. 打开 Eruda Storage 标签查看 authToken
3. 检查 token 是否过期

**临时测试方法**:
```typescript
// lib/storage/index.ts
export async function getAuthToken(): Promise<string | null> {
  return "your-test-token-here"  // 临时测试
}
```

### 2. 看不到数据

**检查步骤**:
1. 打开 Eruda Console 查看日志
2. 检查 Network 标签确认请求发送
3. 验证 API 响应状态和数据
4. 确认订阅符合过滤条件（活跃中 + isActive）

### 3. CORS 错误

**检查 package.json**:
```json
{
  "manifest": {
    "host_permissions": [
      "https://www.88code.org/*"
    ]
  }
}
```

## 最佳实践

### 1. Hook 使用

```typescript
// ✅ 正确：使用缓存
const { dashboard, loading, refresh } = useDashboard(tokenData.isValid)

// ❌ 错误：不要在循环或条件中使用 Hook
if (condition) {
  const data = useDashboard(true)  // 违反 React 规则
}
```

### 2. API 错误处理

```typescript
try {
  const response = await fetchDashboard()
  if (response.success && response.data) {
    setDashboard(response.data)
  } else {
    setError(response.message || "获取失败")
  }
} catch (err) {
  setError(err instanceof Error ? err.message : "未知错误")
}
```

### 3. 缓存管理

```typescript
// 获取数据（使用缓存）
const cachedData = await getCacheData<DashboardData>(CACHE_KEY, CACHE_MAX_AGE)

// 刷新数据（跳过缓存）
refresh()  // 调用 hook 的 refresh 方法
```

## 部署注意事项

### 生产环境

1. **禁用 Eruda**:
```typescript
// popup.tsx
if (process.env.NODE_ENV === "development") {
  eruda.init()  // 仅开发环境启用
}
```

2. **移除测试 token**:
确保 `lib/storage/index.ts` 中的 `getAuthToken` 函数使用正式实现

3. **构建**:
```bash
pnpm build
# 输出: build/chrome-mv3-prod/
```

### Chrome Web Store 发布

1. 准备资源
   - 扩展图标（已包含多尺寸）
   - 截图和宣传图
   - 详细描述

2. 隐私政策
   - 说明数据使用范围
   - Token 存储方式
   - 不收集个人信息

## 文档链接

- [Plasmo 文档](https://docs.plasmo.com/)
- [Chrome Extension 开发指南](https://developer.chrome.com/docs/extensions/)
- [React 文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

## 维护者

88Code Team

## 许可证

MIT License
