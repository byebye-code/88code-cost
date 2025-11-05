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

import { getAuthToken } from "../storage"
import { API_ENDPOINTS, getApiUrl } from "./config"

/**
 * 创建带认证的请求头
 */
async function createAuthHeaders(): Promise<HeadersInit> {
  const authToken = await getAuthToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json"
  }

  if (authToken) {
    headers["authorization"] = `Bearer ${authToken}`
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
