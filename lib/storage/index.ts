/**
 * Storage 管理模块
 * 用于读取和写入浏览器存储
 * 支持 Chrome、Edge、Firefox
 */

import { Storage } from "@plasmohq/storage"

import { browserAPI } from "../browser-api"

export const storage = new Storage()

/**
 * 清理 token 字符串，去除多余的引号和空格
 */
function cleanToken(token: string | null | undefined): string | null {
  if (!token) return null

  let cleaned = token.trim()

  // 去除外层的引号（单引号或双引号）
  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim()
  }

  return cleaned || null
}

/**
 * 从 88code.org 网站的 localStorage 中读取 authToken
 * 需要通过 content script 来访问网站的 localStorage
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // 从扩展自己的 storage 中读取
    let token = await storage.get("authToken")

    // 清理 token（去除引号）
    token = cleanToken(token)

    // 如果没有 token，尝试从网站的 localStorage 中读取
    if (!token) {
      const websiteToken = await getTokenFromWebsite()
      if (websiteToken) {
        await saveAuthToken(websiteToken)
        return cleanToken(websiteToken)
      }
    }

    return token || null
  } catch (error) {
    console.error("[Storage] 读取 token 失败:", error)
    return null
  }
}

/**
 * 从 88code.org 网站的 localStorage 中读取 token
 */
async function getTokenFromWebsite(): Promise<string | null> {
  try {
    console.log("[Storage] 开始查询 88code.org 标签页...")

    // 优先查询当前活跃的 88code.org 标签页
    const activeTabs = await browserAPI.tabs.query({
      url: "https://www.88code.org/*",
      active: true,
      currentWindow: true
    })

    console.log(`[Storage] 找到 ${activeTabs.length} 个活跃标签页`)

    // 如果没有活跃标签页，查询所有标签页
    const tabs = activeTabs.length > 0 ? activeTabs :
      await browserAPI.tabs.query({ url: "https://www.88code.org/*" })

    console.log(`[Storage] 总共找到 ${tabs.length} 个标签页`)

    if (tabs.length === 0) {
      console.warn("[Storage] 未找到 88code.org 标签页，请先访问并登录 88code.org")
      return null
    }

    // 选择最合适的标签页：优先选择活跃的，然后选择第一个
    const tab = activeTabs.length > 0 ? activeTabs[0] : tabs[0]

    console.log("[Storage] 选择的标签页信息:", {
      id: tab.id,
      url: tab.url,
      status: tab.status,
      title: tab.title,
      active: tab.active,
      windowId: tab.windowId
    })

    if (!tab.id) {
      console.error("[Storage] 标签页 ID 为空")
      return null
    }

    // 尝试发送消息，带重试机制
    return await sendMessageWithRetry(tab.id)
  } catch (error) {
    console.error("[Storage] 从网站读取 token 失败:", error)
    return null
  }
}

/**
 * 测试 content script 是否已加载并响应
 */
async function pingContentScript(tabId: number): Promise<boolean> {
  try {
    console.log(`[Storage] Ping 测试 content script (tabId: ${tabId})...`)
    const response = await browserAPI.tabs.sendMessage(tabId, {
      action: "ping"
    })

    if (response?.success) {
      console.log("[Storage] ✅ Content script 响应正常:", response)
      return true
    }

    console.warn("[Storage] ⚠️ Content script 响应异常:", response)
    return false
  } catch (error: any) {
    console.warn("[Storage] ⚠️ Ping 测试失败:", error.message)

    // 打印更详细的调试信息
    console.error("[Storage] 🔍 详细调试信息:")
    console.error("  - Tab ID:", tabId)
    console.error("  - 错误名称:", error.name)
    console.error("  - 错误消息:", error.message)
    console.error("  - 错误堆栈:", error.stack)
    console.error("  - 当前时间:", new Date().toISOString())
    console.error("  - 浏览器信息:", navigator.userAgent)
    console.error("  - 扩展环境:", {
      hasChrome: typeof chrome !== "undefined",
      hasBrowser: typeof browser !== "undefined",
      chromeRuntimeId: chrome?.runtime?.id,
      browserRuntimeId: (typeof browser !== "undefined" && browser?.runtime?.id) || "N/A"
    })

    return false
  }
}

/**
 * 带重试机制的消息发送
 * 解决 Edge/Firefox 浏览器中 content script 初始化时序问题
 * 使用指数退避策略：200ms, 400ms, 800ms, 1600ms, 3200ms
 */
async function sendMessageWithRetry(
  tabId: number,
  maxRetries: number = 6,
  initialDelay: number = 200
): Promise<string | null> {
  console.log(`[Storage] 准备发送消息到标签页 ${tabId}`)

  // 先进行 ping 测试，确认 content script 是否可用
  const isPingSuccess = await pingContentScript(tabId)
  if (!isPingSuccess) {
    console.error("[Storage] ❌ Content script ping 测试失败")
    console.error("[Storage] 💡 解决方案：请刷新 88code.org 页面后重试")
    console.error("[Storage] 原因：页面在扩展安装/更新前已打开，content script 未注入")
    return null
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`[Storage] 第 ${i + 1}/${maxRetries} 次尝试发送消息...`)

      // 向内容脚本发送消息，请求读取 localStorage（使用跨浏览器 API）
      const response = await browserAPI.tabs.sendMessage(tabId, {
        action: "getLocalStorage"
      })

      console.log(`[Storage] 收到响应:`, {
        hasResponse: !!response,
        hasToken: !!response?.authToken,
        tokenKey: response?.tokenKey,
        localStorageKeys: response?.allLocalStorage ? Object.keys(response.allLocalStorage).length : 0
      })

      if (response?.authToken) {
        console.log(`[Storage] ✅ 成功读取 token (尝试 ${i + 1}/${maxRetries})`)
        return response.authToken
      }

      console.warn(`[Storage] 响应中没有 token`)
      return null
    } catch (error: any) {
      const isLastRetry = i === maxRetries - 1

      console.error(`[Storage] 第 ${i + 1}/${maxRetries} 次尝试失败:`, {
        errorMessage: error.message,
        errorName: error.name,
        stack: error.stack?.split('\n')[0]
      })

      // 如果是连接错误且不是最后一次重试，等待后重试
      if (error.message?.includes("Receiving end does not exist") && !isLastRetry) {
        // 指数退避：每次延迟时间翻倍
        const delay = initialDelay * Math.pow(2, i)
        console.log(`[Storage] Content script 未就绪，${delay}ms 后重试 (${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // 最后一次重试失败，或其他错误
      if (isLastRetry) {
        console.error("[Storage] ❌ 从网站读取 token 失败:", error.message)
        console.error("[Storage] 可能原因:")
        console.error("  1. Content script 未注入到页面")
        console.error("  2. 88code.org 页面未加载完成")
        console.error("  3. 浏览器扩展权限不足")
      }
      return null
    }
  }

  return null
}

/**
 * 保存 authToken 到 storage
 */
export async function saveAuthToken(token: string): Promise<void> {
  try {
    await storage.set("authToken", token)
  } catch (error) {
    console.error("[Storage] 保存 authToken 失败:", error)
  }
}

/**
 * 清除 authToken
 */
export async function clearAuthToken(): Promise<void> {
  try {
    await storage.remove("authToken")
  } catch (error) {
    console.error("[Storage] 清除 authToken 失败:", error)
  }
}

/**
 * 缓存数据接口
 */
interface CacheData<T> {
  data: T
  timestamp: number
}

/**
 * 保存缓存数据
 */
export async function setCacheData<T>(
  key: string,
  data: T
): Promise<void> {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now()
    }
    await storage.set(key, cacheData)
  } catch (error) {
    console.error(`[Storage] 保存缓存 ${key} 失败:`, error)
  }
}

/**
 * 获取缓存数据
 * @param maxAge 最大缓存时间（毫秒），如果超过此时间则返回 null
 */
export async function getCacheData<T>(
  key: string,
  maxAge?: number
): Promise<T | null> {
  try {
    const cacheData = await storage.get(key) as CacheData<T> | null

    if (!cacheData || !cacheData.data) {
      return null
    }

    // 如果设置了 maxAge，检查缓存是否过期
    if (maxAge && Date.now() - cacheData.timestamp > maxAge) {
      await storage.remove(key)
      return null
    }

    return cacheData.data
  } catch (error) {
    console.error(`[Storage] 读取缓存 ${key} 失败:`, error)
    return null
  }
}

/**
 * 清除缓存数据
 */
export async function clearCacheData(key: string): Promise<void> {
  try {
    await storage.remove(key)
  } catch (error) {
    console.error(`[Storage] 清除缓存 ${key} 失败:`, error)
  }
}
