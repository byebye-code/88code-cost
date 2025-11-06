# 88Code Cost - Claude 开发指南

## 项目概述

88Code Cost 是一个基于 Plasmo 框架开发的 Chrome 浏览器扩展，用于实时监控 88code.org 平台的套餐使用情况和额度。

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

---

## 扩展图标状态说明

### 为什么图标有时是灰色的？

这是 Chrome 扩展的**正常行为**：

- ✅ **彩色图标**：在 `https://www.88code.org/*` 页面上
- ⚠️ **灰色图标**：在其他网站上（如 Google、GitHub 等）

**原因：** Chrome 根据 `manifest.json` 中的 `host_permissions` 来决定图标状态。灰色表示扩展在当前页面没有权限。

### 如何让图标始终保持彩色？

在 `package.json` 中添加 `activeTab` 权限：

```json
{
  "manifest": {
    "permissions": [
      "storage",
      "tabs",
      "cookies",
      "scripting",
      "activeTab"  // 添加这一行
    ]
  }
}
```

**优点：**
- 图标在所有页面都是彩色的
- 用户可以在任何页面打开扩展查看数据
- 安全性高，`activeTab` 是受限权限

---

## 性能优化建议

### 1. 合并重复的定时器

**问题：** `popup.tsx` 中有两个独立的定时器可能导致重复刷新

**解决方案：**

```typescript
// 优化后：统一的刷新逻辑
useEffect(() => {
  if (!tokenData.isValid) return

  // 优先使用用户设置，否则使用默认30秒
  const interval = settings.autoRefreshEnabled
    ? settings.autoRefreshInterval * 1000
    : 30 * 1000

  console.log(`[Popup] 启用自动刷新，间隔 ${interval / 1000} 秒`)

  const timer = setInterval(() => {
    console.log("[Popup] 自动刷新数据")
    handleRefresh()
  }, interval)

  return () => clearInterval(timer)
}, [tokenData.isValid, settings.autoRefreshEnabled, settings.autoRefreshInterval])
```

### 2. 优化 Content Script 注入

使用 Promise.race 实现超时机制，替代复杂的重试逻辑：

```typescript
async function sendMessageWithTimeout(
  tabId: number,
  timeout: number = 5000
): Promise<string | null> {
  const timeoutPromise = new Promise<null>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeout)
  )

  const messagePromise = browserAPI.tabs.sendMessage(tabId, {
    action: "getLocalStorage"
  })

  try {
    const response = await Promise.race([messagePromise, timeoutPromise])
    return response?.authToken || null
  } catch (error) {
    console.error("[Storage] 消息发送超时或失败:", error)
    return null
  }
}
```

### 3. 添加错误边界

```typescript
// components/ErrorBoundary.tsx
import React from 'react'

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-red-600">出错了</h2>
          <p className="text-sm text-gray-600 mt-2">
            {this.state.error?.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            重新加载
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

---

## 安全性最佳实践

### 1. 保护敏感信息

**问题：** Token 在控制台明文打印

```typescript
// ❌ 不安全
console.log("[API] 使用 token:", authToken.substring(0, 20) + "...")

// ✅ 只在开发环境打印
const logToken = (token: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log("[API] 使用 token:", token.substring(0, 10) + "***")
  }
}
```

### 2. 权限最小化

只请求必要的权限：

```json
{
  "permissions": [
    "storage",      // 必需：存储缓存和设置
    "tabs",         // 必需：读取 88code.org 的 localStorage
    "scripting",    // 必需：注入 content script
    "activeTab"     // 推荐：让图标始终可用
  ]
}
```

### 3. 输入验证

```typescript
// 验证 API 响应
function validateSubscription(sub: any): sub is Subscription {
  return (
    typeof sub.id === 'number' &&
    typeof sub.subscriptionStatus === 'string' &&
    typeof sub.isActive === 'boolean'
  )
}

// 使用
const subscriptions = result.data.filter(validateSubscription)
```

---

## 测试指南

### 单元测试

```bash
# 安装测试依赖
pnpm add -D @testing-library/react @testing-library/jest-dom jest

# 运行测试
pnpm test
```

**示例测试：**

```typescript
// hooks/__tests__/useAuth.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useAuth } from '../useAuth'

describe('useAuth', () => {
  it('should return valid token data when authenticated', async () => {
    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.tokenData.isValid).toBe(true)
  })
})
```

### E2E 测试

```bash
# 安装 Playwright
pnpm add -D playwright

# 运行 E2E 测试
pnpm test:e2e
```

---

## 故障排查

### 问题 1：扩展图标是灰色的

**原因：** 当前页面不在 `host_permissions` 范围内

**解决方案：**
1. 添加 `activeTab` 权限（推荐）
2. 或者访问 88code.org 页面

### 问题 2：Content Script 未注入

**症状：** 控制台显示 "Receiving end does not exist"

**解决方案：**
1. 刷新 88code.org 页面
2. 重新加载扩展
3. 检查 `manifest.json` 中的 `content_scripts` 配置

### 问题 3：数据不刷新

**检查步骤：**
1. 打开 Eruda Console 查看日志
2. 检查 Network 标签确认 API 请求
3. 验证 token 是否有效
4. 清除缓存后重试

### 问题 4：扩展崩溃

**解决方案：**
1. 打开 `chrome://extensions/`
2. 找到扩展，点击"错误"查看详情
3. 检查 Service Worker 日志
4. 重新加载扩展

---

## 贡献指南

### 代码规范

1. **TypeScript**：所有新代码必须使用 TypeScript
2. **ESLint**：运行 `pnpm lint` 检查代码
3. **Prettier**：运行 `pnpm format` 格式化代码
4. **Commit 规范**：使用 Conventional Commits

```bash
# 示例
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码格式调整
refactor: 重构代码
test: 添加测试
chore: 构建工具或依赖更新
```

### 提交 PR 流程

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交代码：`git commit -m "feat: your feature"`
4. 推送分支：`git push origin feature/your-feature`
5. 创建 Pull Request

### 代码审查清单

- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 TypeScript 类型检查
- [ ] 添加了必要的注释
- [ ] 更新了相关文档
- [ ] 添加了单元测试（如适用）
- [ ] 测试通过

---

## 更多资源

### 官方文档

- [Plasmo 文档](https://docs.plasmo.com/)
- [Chrome Extension 开发指南](https://developer.chrome.com/docs/extensions/)
- [React 文档](https://react.dev/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [shadcn/ui 文档](https://ui.shadcn.com/)

### 推荐阅读

- [Chrome Extension 最佳实践](https://developer.chrome.com/docs/extensions/mv3/intro/mv3-overview/)
- [React 性能优化](https://react.dev/learn/render-and-commit)
- [TypeScript 最佳实践](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

### 社区支持

- [GitHub Issues](https://github.com/88code/88code-cost/issues)
- [Discord 社区](https://discord.gg/88code)
- [技术博客](https://blog.88code.org)

---

## 更新日志

### v1.0.0 (2025-11-06)

**新增功能：**
- ✅ 完整的认证系统
- ✅ 实时数据监控
- ✅ 套餐额度管理
- ✅ 定时自动重置
- ✅ 深色模式支持
- ✅ 跨浏览器兼容（Chrome、Edge、Firefox）

**优化改进：**
- ✅ 5 分钟缓存机制
- ✅ 骨架屏加载优化
- ✅ 友好的错误提示
- ✅ Content Script 重试机制

**已知问题：**
- ⚠️ 图标在非 88code.org 页面显示为灰色（正常行为）
- ⚠️ 缺少单元测试

---

**文档版本：** v1.1.0
**最后更新：** 2025-11-06
