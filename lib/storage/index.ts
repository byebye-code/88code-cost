/**
 * Storage 管理模块
 * 用于读取和写入浏览器存储
 */

import { Storage } from "@plasmohq/storage"

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
    // 查询 88code.org 的标签页
    const tabs = await chrome.tabs.query({ url: "https://www.88code.org/*" })

    if (tabs.length === 0) {
      return null
    }

    const tab = tabs[0]
    if (!tab.id) {
      return null
    }

    try {
      // 向内容脚本发送消息，请求读取 localStorage
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getLocalStorage"
      })

      return response?.authToken || null
    } catch (error: any) {
      console.error("[Storage] 从网站读取 token 失败:", error.message)
      return null
    }
  } catch (error) {
    console.error("[Storage] 从网站读取 token 失败:", error)
    return null
  }
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
