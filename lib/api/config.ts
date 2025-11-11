/**
 * API 配置管理
 * 定义 88Code API 的基础 URL 和端点
 */

// 88Code API 基础 URL
export const API_BASE_URL = "https://www.88code.org"

// API 端点
export const API_ENDPOINTS = {
  LOGIN_INFO: "/admin-api/login/getLoginInfo",
  SUBSCRIPTIONS: "/admin-api/cc-admin/system/subscription/my",
  DASHBOARD: "/admin-api/cc-admin/user/dashboard",
  USAGE_TREND: "/admin-api/cc-admin/user/usage-trend",
  AUTO_RESET: "/admin-api/cc-admin/system/subscription/my/auto-reset",
  RESET_CREDITS: "/admin-api/cc-admin/system/subscription/my/reset-credits"
} as const

/**
 * 获取完整的 API URL
 */
export function getApiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint}`
}
