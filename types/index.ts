/**
 * 88Code API 类型定义
 */

// 套餐计划信息
export interface SubscriptionPlan {
  id: number
  subscriptionName: string
  billingCycle: string
  cost: number
  features: string
  creditLimit: number
  planType: string
}

// 订阅信息
export interface Subscription {
  id: number
  employeeId: number
  employeeName: string
  employeeEmail: string
  currentCredits: number
  subscriptionPlanId: number
  subscriptionPlanName: string
  cost: number
  startDate: string
  endDate: string
  billingCycle: string
  billingCycleDesc: string
  remainingDays: number
  subscriptionStatus: string
  subscriptionPlan: SubscriptionPlan
  isActive: boolean
  autoRenew: boolean
  autoResetWhenZero: boolean
  lastCreditReset: string | null
  resetTimes: number
}

// 登录信息
export interface LoginInfo {
  employeeId: number
  userType: string
  loginName: string
  actualName: string
  email: string
  token: string
  referralCode: string
}

// Dashboard 概览
export interface DashboardOverview {
  totalApiKeys: number
  activeApiKeys: number
  totalRequestsUsed: number
  totalTokensUsed: number
  totalInputTokensUsed: number
  totalOutputTokensUsed: number
  totalCacheCreateTokensUsed: number
  totalCacheReadTokensUsed: number
  cost: number
}

// Dashboard 最近活动
export interface DashboardActivity {
  requestsToday: number
  tokensToday: number
  inputTokensToday: number
  outputTokensToday: number
  cacheCreateTokensToday: number
  cacheReadTokensToday: number
  cost: number
}

// Dashboard 数据
export interface DashboardData {
  overview: DashboardOverview
  recentActivity: DashboardActivity
}

// 88Code API 响应通用结构
export interface Code88Response<T> {
  code: number
  ok: boolean
  msg: string
  data: T
  dataType: number
}

// 内部使用的 API 响应结构
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: any
}

// 认证 Token 数据
export interface TokenData {
  authToken: string | null
  isValid: boolean
}

// 视图类型
export enum ViewType {
  MAIN = "main",
  SETTINGS = "settings"
}

// 主题类型
export enum ThemeType {
  LIGHT = "light",
  DARK = "dark",
  AUTO = "88code" // 跟随 88code 网站主题
}

// 定时重置时间窗口
export interface ScheduledResetWindow {
  enabled: boolean
  hour: number // 0-23
  minute: number // 0-59
  randomMinutes: number // 随机偏移分钟数 (0-10)
}

// 定时重置配置
export interface ScheduledResetConfig {
  enabled: boolean
  windows: ScheduledResetWindow[] // 可配置多个时间窗口
  minCreditsFor19: number // 19:00 前的最小额度要求 (默认 1)
  minCreditsFor00: number // 00:00 前的最小额度要求 (默认 1)
  maxResetTimes: number // 每日最大重置次数限制 (默认 2)
}

// 应用设置
export interface AppSettings {
  // 显示设置
  showDetailedTokenStats: boolean // 是否显示详细的Token统计

  // 自动刷新设置
  autoRefreshEnabled: boolean // 是否启用自动刷新
  autoRefreshInterval: number // 自动刷新间隔（秒），默认60

  // 主题设置
  theme: ThemeType // 主题模式

  // 定时重置设置
  scheduledReset: ScheduledResetConfig
}

// 默认设置
export const DEFAULT_SETTINGS: AppSettings = {
  showDetailedTokenStats: false,
  autoRefreshEnabled: false,
  autoRefreshInterval: 60,
  theme: ThemeType.AUTO,
  scheduledReset: {
    enabled: true,
    windows: [
      {
        enabled: true,
        hour: 19,
        minute: 0,
        randomMinutes: 5
      },
      {
        enabled: true,
        hour: 0,
        minute: 0,
        randomMinutes: 5
      }
    ],
    minCreditsFor19: 1,
    minCreditsFor00: 1,
    maxResetTimes: 2
  }
}
