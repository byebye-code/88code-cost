# 开发指南

## 项目设置

### 安装依赖

```bash
pnpm install
```

### 启动开发模式

```bash
pnpm dev
```

开发服务器启动后，构建文件会生成在 `build/chrome-mv3-dev` 目录。

### 运行单元测试

```bash
pnpm test
```

### 加载扩展到浏览器

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启右上角的"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择 `build/chrome-mv3-dev` 目录

## 测试接口对接

### 准备工作

1. **访问 88code.org 并登录**
   - 打开 https://www.88code.org
   - 使用您的账号登录
   - 确保登录成功

2. **设置 authToken（临时测试方法）**

   由于扩展需要从网站的 storage 读取 authToken，目前有两种方式设置：

   #### 方法一：在 88code.org 网站控制台设置

   ```javascript
   // 在 88code.org 网站的控制台执行
   chrome.storage.local.set({ authToken: 'your-token-here' })
   ```

   #### 方法二：修改扩展代码临时硬编码（仅用于测试）

   在 `lib/storage/index.ts` 的 `getAuthToken` 函数中临时返回测试 token：

   ```typescript
   export async function getAuthToken(): Promise<string | null> {
     // 临时测试用
     return "1bdfcc5f69c044848cdaeb9f72d3c3b4"

     // 生产代码
     // try {
     //   const token = await storage.get("authToken")
     //   return token || null
     // } catch (error) {
     //   console.error("[Storage] 读取 authToken 失败:", error)
     //   return null
     // }
   }
   ```

### 查看 API 响应

扩展会自动将所有 API 响应打印到控制台。查看方式：

1. **打开扩展 Popup**
   - 点击浏览器工具栏中的扩展图标

2. **打开开发者工具**
   - 在开发模式下，Popup 会自动显示 Eruda 调试工具
   - 或者右键点击 Popup -> 检查

3. **查看控制台输出**

   控制台会显示 API 请求和响应信息，包括：
   - 认证信息
   - 请求 URL
   - 响应状态
   - 响应数据

## 调试技巧

### 1. 使用 Eruda 调试工具

开发模式下会自动启用 Eruda，可以在 Popup 中直接查看：
- Console 日志
- Network 请求
- Storage 数据
- Elements 元素

### 2. 查看 Network 请求

在 Eruda 的 Network 标签中，可以看到：
- 请求 URL
- 请求头（包括 Authorization）
- 响应状态
- 响应内容

### 3. 检查 Storage

在 Eruda 的 Storage 标签中，可以查看：
- `authToken` 的值
- 其他存储的数据

### 4. 强制刷新数据

点击 Popup 右上角的刷新按钮，会重新获取所有数据并在控制台打印。

## 常见问题

### 1. 看不到数据

**检查步骤**：
1. 确认 authToken 已设置
2. 查看控制台是否有错误
3. 检查 Network 标签查看请求是否发送成功
4. 确认 API 端点是否正确

### 2. 认证失败

**可能原因**：
- authToken 未设置或已过期
- Authorization 头格式不正确
- API 服务器拒绝请求

**解决方法**：
- 重新登录 88code.org
- 重新设置 authToken
- 检查控制台日志

### 3. CORS 错误

如果遇到 CORS 错误，检查 `package.json` 中的 `host_permissions` 是否包含正确的域名：

```json
"manifest": {
  "host_permissions": [
    "https://www.88code.org/*"
  ]
}
```

## 下一步

完成接口测试后，您可以：

1. 根据实际 API 响应调整类型定义
2. 完善错误处理
3. 优化 UI 和交互体验
4. 添加数据缓存和自动刷新功能
