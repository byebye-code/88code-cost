/**
 * Storage 管理模块
 * 用于读取和写入浏览器存储
 * 支持 Chrome、Edge、Firefox
 */

import { Storage } from "@plasmohq/storage"

import { browserAPI } from "../browser-api"
import { storageLogger } from "../utils/logger"
import { cleanToken } from "../utils/token"

export const storage = new Storage()

// Content script 响应类型
interface PingResponse {
  success: boolean
}

interface GetLocalStorageResponse {
  authToken?: string
}

/**
 * 检查是否有打开的 88code.org 标签页
 */
export async function hasOpenWebsiteTabs(): Promise<boolean> {
  try {
    const tabs = await browserAPI.tabs.query({ url: "https://www.88code.org/*" })
    return tabs.length > 0
  } catch (error) {
    storageLogger.error("检查标签页失败:", error)
    return false
  }
}

/**
 * 从 88code.org 网站的 localStorage 中读取 authToken
 * 需要通过 content script 来访问网站的 localStorage
 *
 * 策略优化（支持降级）：
 * 1. 先检查是否有打开的 88code.org 标签页
 * 2. 有标签页：从网站 localStorage 读取 token（确保获取最新）
 * 3. 没有标签页：快速返回 null，让调用方使用缓存 token
 * 4. 读取成功后同步到扩展 storage（供 background 等使用）
 */
export async function getAuthToken(): Promise<string | null> {
  try {
    // 先检查是否有打开的 88code.org 标签页
    const hasOpenTabs = await hasOpenWebsiteTabs()

    if (!hasOpenTabs) {
      return null
    }

    storageLogger.debug("尝试从网站 localStorage 读取 token")
    const websiteToken = await getTokenFromWebsite()

    if (websiteToken) {
      const cleanedToken = cleanToken(websiteToken)
      storageLogger.info("成功从网站读取 token，已同步到扩展 storage")
      // 同步到扩展 storage（供 background 等其他场景使用）
      await saveAuthToken(cleanedToken || "")
      return cleanedToken
    }

    storageLogger.warn("网站 localStorage 中未找到 token")
    return null
  } catch (error) {
    storageLogger.error("读取 token 失败:", error)
    return null
  }
}

/**
 * 从 88code.org 网站的 localStorage 中读取 token
 */
async function getTokenFromWebsite(): Promise<string | null> {
  try {
    storageLogger.debug("开始查询 88code.org 标签页")

    // 优先查询当前活跃的 88code.org 标签页
    const activeTabs = await browserAPI.tabs.query({
      url: "https://www.88code.org/*",
      active: true,
      currentWindow: true
    })

    storageLogger.debug(`找到 ${activeTabs.length} 个活跃标签页`)

    // 如果没有活跃标签页，查询所有标签页
    const tabs = activeTabs.length > 0 ? activeTabs :
      await browserAPI.tabs.query({ url: "https://www.88code.org/*" })

    storageLogger.debug(`总共找到 ${tabs.length} 个匹配标签页`)

    if (tabs.length === 0) {
      storageLogger.warn("未找到 88code.org 标签页")
      return null
    }

    // 选择最合适的标签页：优先选择活跃的，然后选择第一个
    const tab = activeTabs.length > 0 ? activeTabs[0] : tabs[0]

    storageLogger.debug("选择的标签页 ID:", tab.id)

    if (!tab.id) {
      storageLogger.error("标签页 ID 为空，无法发送消息")
      return null
    }

    // 尝试发送消息，带重试机制
    return await sendMessageWithRetry(tab.id)
  } catch (error) {
    storageLogger.error("从网站读取 token 失败:", error)
    return null
  }
}

/**
 * 测试 content script 是否已加载并响应
 */
async function pingContentScript(tabId: number): Promise<boolean> {
  try {
    storageLogger.debug(`Ping content script (tabId: ${tabId})`)
    const response = await browserAPI.tabs.sendMessage(tabId, {
      action: "ping"
    }) as PingResponse

    if (response?.success) {
      storageLogger.debug("Content script 响应正常")
      return true
    }

    storageLogger.warn("Content script 响应异常")
    return false
  } catch (error: any) {
    storageLogger.warn("Ping 测试失败", error)

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
  storageLogger.debug(`准备向标签页 ${tabId} 发送消息以获取 token`)

  // 先进行 ping 测试，确认 content script 是否可用
  const isPingSuccess = await pingContentScript(tabId)
  if (!isPingSuccess) {
    storageLogger.error("Content script ping 测试失败，可能尚未注入")
    return null
  }

  for (let i = 0; i < maxRetries; i++) {
    try {
      storageLogger.debug(`第 ${i + 1}/${maxRetries} 次尝试发送消息`)

      // 向内容脚本发送消息，请求读取 localStorage（使用跨浏览器 API）
      const response = await browserAPI.tabs.sendMessage(tabId, {
        action: "getLocalStorage"
      }) as GetLocalStorageResponse

      storageLogger.debug(
        `收到响应 (hasResponse=${!!response}, hasToken=${!!response?.authToken})`
      )

      if (response?.authToken) {
        storageLogger.info(`成功读取 token (尝试 ${i + 1}/${maxRetries})`)
        return response.authToken
      }

      storageLogger.warn("响应中没有 token")
      return null
    } catch (error: any) {
      const isLastRetry = i === maxRetries - 1

      storageLogger.error(`第 ${i + 1}/${maxRetries} 次尝试失败`, error)

      // 如果是连接错误且不是最后一次重试，等待后重试
      if (error.message?.includes("Receiving end does not exist") && !isLastRetry) {
        // 指数退避：每次延迟时间翻倍
        const delay = initialDelay * Math.pow(2, i)
        storageLogger.warn(`Content script 未就绪，${delay}ms 后重试 (${i + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      // 最后一次重试失败，或其他错误
      if (isLastRetry) {
        storageLogger.error("从网站读取 token 失败", error)
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
    storageLogger.error("保存 authToken 失败:", error)
  }
}

/**
 * 从扩展 storage 直接读取 authToken
 * 用于 background worker 等无法访问网站 localStorage 的场景
 */
export async function getAuthTokenFromStorage(): Promise<string | null> {
  try {
    const token = await storage.get("authToken")
    return token ? cleanToken(token as string) : null
  } catch (error) {
    storageLogger.error("从 storage 读取 token 失败:", error)
    return null
  }
}

/**
 * 清除 authToken
 */
export async function clearAuthToken(): Promise<void> {
  try {
    await storage.remove("authToken")
  } catch (error) {
    storageLogger.error("清除 authToken 失败:", error)
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
    storageLogger.error(`保存缓存 ${key} 失败:`, error)
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
    storageLogger.error(`读取缓存 ${key} 失败:`, error)
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
    storageLogger.error(`清除缓存 ${key} 失败:`, error)
  }
}
