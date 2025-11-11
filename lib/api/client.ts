/**
 * 88Code API 客户端
 * 负责所有 API 请求的统一管理
 */

import type {
  ApiResponse,
  Code88Response,
  DashboardData,
  LoginInfo,
  Subscription
} from "~/types"

import { getAuthToken, getAuthTokenFromStorage } from "../storage"
import { API_ENDPOINTS, getApiUrl } from "./config"

import { apiLogger } from "../utils/logger"

/**
 * 会话级别的 token 缓存
 * 在单次 popup 打开期间复用 token，避免重复调用 getAuthToken()
 */
let sessionTokenCache: string | null = null
let sessionTokenPromise: Promise<string | null> | null = null

/**
 * 检测是否在 background worker 上下文中
 */
function isBackgroundContext(): boolean {
  // 检测是否有 document 对象（background worker 中没有）
  if (typeof document === 'undefined') {
    return true
  }

  // 检测是否在 service worker 中
  if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
    return true
  }

  return false
}

/**
 * 获取会话级别缓存的 token
 * 如果是首次调用，从网站读取并缓存；后续调用直接返回缓存
 *
 * 注意：此函数处理并发调用，多个同时调用只会触发一次 getAuthToken()
 *
 * Background Worker 策略：
 * 1. 优先从扩展 storage 读取（由 popup 同步过来）
 * 2. 如果 storage 为空，尝试从网站读取（可能失败）
 */
export async function getSessionToken(): Promise<string | null> {
  // 如果已有缓存，直接返回
  if (sessionTokenCache !== null) {
    apiLogger.debug("使用会话缓存的 token")
    return sessionTokenCache
  }

  // 如果正在获取 token（防止并发重复调用），等待该 Promise
  if (sessionTokenPromise) {
    apiLogger.debug("等待正在进行的 token 获取...")
    return await sessionTokenPromise
  }

  // 首次获取 token
  const isBackground = isBackgroundContext()
  if (isBackground) {
    console.log("[API] 在 background 上下文中，优先从 storage 读取 token")

    sessionTokenPromise = getAuthTokenFromStorage()
      .then(token => {
        if (token) {
          console.log("[API] ✅ 从 storage 读取 token 成功")
          sessionTokenCache = token
          sessionTokenPromise = null
          return token
        }

        // Storage 为空，尝试从网站读取（可能失败）
        console.log("[API] ⚠️ Storage 中没有 token，尝试从网站读取（可能失败）")
        return getAuthToken()
          .then(webToken => {
            sessionTokenCache = webToken
            sessionTokenPromise = null
            if (webToken) {
              console.log("[API] ✅ 从网站读取 token 成功")
            } else {
              console.error("[API] ❌ 从网站读取 token 失败")
              console.error("[API] [TIP] 请先打开 popup，让它从网站同步 token 到 storage")
            }
            return webToken
          })
      })
      .catch(error => {
        apiLogger.error("获取 token 失败:", error)
        sessionTokenPromise = null
        return null
      })
  } else {
    // Popup 上下文：优先从网站读取，降级到缓存
    apiLogger.info("首次获取 token（会话开始）")
    sessionTokenPromise = getAuthToken()
      .then(token => {
        if (token) {
          // 从网站读取成功（有打开的标签页）
          console.log("[API] ✅ 从网站读取 token 成功")
          sessionTokenCache = token
          sessionTokenPromise = null
          return token
        }

        // 网站读取失败（没有打开的标签页），降级到缓存
        console.log("[API] ⚠️ 没有打开的网站标签页，尝试使用缓存 token")
        return getAuthTokenFromStorage()
          .then(cachedToken => {
            sessionTokenCache = cachedToken
            sessionTokenPromise = null
            if (cachedToken) {
              console.log("[API] ✅ 使用缓存 token")
            } else {
              console.error("[API] ❌ 缓存中也没有 token")
              console.error("[API] [TIP] 请先访问并登录 88code.org")
            }
            return cachedToken
          })
      })
      .catch(error => {
        apiLogger.error("获取 token 失败:", error)
        sessionTokenPromise = null
        return null
      })
  }

  return await sessionTokenPromise
}

/**
 * 清除会话级别的 token 缓存
 * 在需要强制刷新 token 时调用
 */
export function clearSessionTokenCache() {
  console.log("[API] 清除会话 token 缓存")
  sessionTokenCache = null
  sessionTokenPromise = null
}

/**
 * 创建带认证的请求头
 */
async function createAuthHeaders(): Promise<HeadersInit> {
  const authToken = await getSessionToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json"
  }

  if (authToken) {
    headers["authorization"] = `Bearer ${authToken}`
    apiLogger.debug("使用授权 token 发起请求")
  } else {
    console.warn("[API] [WARN] 没有找到 authToken")
  }

  return headers
}

/**
 * 通用请求方法
 */
async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const headers = await createAuthHeaders()
    const finalHeaders = {
      ...headers,
      ...options.headers
    }

    console.log(`[API] 请求: ${options.method || "GET"} ${url}`)

    const response = await fetch(url, {
      ...options,
      headers: finalHeaders
    })

    const responseText = await response.text()

    let data: Code88Response<T>
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error(`[API] 响应解析失败:`, responseText)
      return {
        success: false,
        data: null as any,
        message: "响应数据格式错误"
      }
    }

    if (!response.ok || !data.ok) {
      console.error(`[API] 请求失败 [${response.status}]:`, data.msg)
      return {
        success: false,
        data: null as any,
        message: data.msg || "请求失败",
        error: data
      }
    }

    console.log(`[API] 请求成功`)
    return {
      success: true,
      data: data.data
    }
  } catch (error) {
    console.error(`[API] 请求异常:`, error)
    return {
      success: false,
      data: null as any,
      message: error instanceof Error ? error.message : "未知错误"
    }
  }
}

/**
 * 获取登录信息
 */
export async function fetchLoginInfo(): Promise<ApiResponse<LoginInfo>> {
  const url = getApiUrl(API_ENDPOINTS.LOGIN_INFO)
  return await request<LoginInfo>(url)
}

/**
 * 获取订阅信息（只返回活跃的订阅）
 */
export async function fetchSubscriptions(): Promise<
  ApiResponse<Subscription[]>
> {
  const url = getApiUrl(API_ENDPOINTS.SUBSCRIPTIONS)
  const result = await request<Subscription[]>(url)

  if (result.success && result.data) {
    // 只返回状态为"活跃中"且 isActive 为 true 的订阅
    result.data = result.data.filter(
      (sub) => sub.subscriptionStatus === "活跃中" && sub.isActive === true
    )
    console.log(`[API] 过滤后的活跃订阅数量: ${result.data.length}`)
  }

  return result
}

/**
 * 获取 Dashboard 统计信息
 */
export async function fetchDashboard(): Promise<ApiResponse<DashboardData>> {
  const url = getApiUrl(API_ENDPOINTS.DASHBOARD)
  return await request<DashboardData>(url)
}

/**
 * 切换自动重置开关
 * @param subscriptionId 订阅ID
 * @param autoResetWhenZero 是否在额度为0时自动重置
 */
export async function toggleAutoReset(
  subscriptionId: number,
  autoResetWhenZero: boolean
): Promise<ApiResponse<any>> {
  const url = `${getApiUrl(API_ENDPOINTS.AUTO_RESET)}/${subscriptionId}?autoResetWhenZero=${autoResetWhenZero}`
  return await request<any>(url, { method: "POST" })
}

/**
 * 手动重置套餐额度
 * @param subscriptionId 订阅ID
 */
export async function resetCredits(
  subscriptionId: number
): Promise<ApiResponse<any>> {
  const url = `${getApiUrl(API_ENDPOINTS.RESET_CREDITS)}/${subscriptionId}`
  return await request<any>(url, { method: "POST" })
}
