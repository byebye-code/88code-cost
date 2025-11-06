/**
 * Background Service - 定时重置功能
 * 在后台运行，监控定时重置时间窗口并自动执行重置
 */

import { Storage } from "@plasmohq/storage"

import { browserAPI } from "~/lib/browser-api"
import type { AppSettings, Subscription } from "~/types"
import { DEFAULT_SETTINGS } from "~/types"
import { resetCredits } from "~/lib/api/client"

const storage = new Storage()
const SETTINGS_KEY = "app_settings"
const LAST_RESET_CHECK_KEY = "last_reset_check"
const DAILY_RESET_COUNT_KEY = "daily_reset_count"

// 每分钟检查一次
const CHECK_INTERVAL = 60 * 1000

console.log("[Background] 定时重置服务已启动")

/**
 * 获取当前设置
 */
async function getSettings(): Promise<AppSettings> {
  try {
    const stored = await storage.get(SETTINGS_KEY)
    if (stored) {
      const parsedSettings = JSON.parse(stored) as AppSettings
      return { ...DEFAULT_SETTINGS, ...parsedSettings }
    }
  } catch (error) {
    console.error("[Background] 加载设置失败:", error)
  }
  return DEFAULT_SETTINGS
}

/**
 * 获取认证 Token
 */
async function getAuthToken(): Promise<string | null> {
  try {
    // 从 cookies 中获取 token
    const cookies = await browserAPI.cookies.getAll({
      domain: "88code.org"
    })
    const tokenCookie = cookies.find(c => c.name === "88code-token" || c.name === "token")
    return tokenCookie?.value || null
  } catch (error) {
    console.error("[Background] 获取 Token 失败:", error)
    return null
  }
}

/**
 * 获取订阅列表
 */
async function getSubscriptions(token: string): Promise<Subscription[]> {
  try {
    const response = await fetch("https://www.88code.org/api/88admin/subscriptions", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const result = await response.json()
    if (result.ok && result.data) {
      // 只返回活跃的订阅
      return result.data.filter((sub: Subscription) => sub.isActive)
    }
  } catch (error) {
    console.error("[Background] 获取订阅列表失败:", error)
  }
  return []
}

/**
 * 检查是否在时间窗口内
 */
function isInTimeWindow(
  hour: number,
  minute: number,
  randomMinutes: number
): boolean {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  // 计算目标时间窗口范围
  const targetMinutes = hour * 60 + minute
  const currentMinutes = currentHour * 60 + currentMinute

  // 添加随机偏移 (±randomMinutes)
  const minWindow = targetMinutes - randomMinutes
  const maxWindow = targetMinutes + randomMinutes

  return currentMinutes >= minWindow && currentMinutes <= maxWindow
}

/**
 * 获取今日重置次数
 */
async function getTodayResetCount(): Promise<{ date: string; count: number }> {
  try {
    const stored = await storage.get(DAILY_RESET_COUNT_KEY)
    if (stored) {
      const data = JSON.parse(stored)
      const today = new Date().toDateString()
      // 如果是同一天，返回计数；否则重置
      if (data.date === today) {
        return data
      }
    }
  } catch (error) {
    console.error("[Background] 获取重置次数失败:", error)
  }
  return { date: new Date().toDateString(), count: 0 }
}

/**
 * 增加今日重置次数
 */
async function incrementTodayResetCount(): Promise<void> {
  const resetData = await getTodayResetCount()
  resetData.count++
  await storage.set(DAILY_RESET_COUNT_KEY, JSON.stringify(resetData))
}

/**
 * 检查订阅是否需要重置
 */
function shouldResetSubscription(
  subscription: Subscription,
  settings: AppSettings,
  currentHour: number
): boolean {
  const { currentCredits, subscriptionPlan } = subscription
  const creditLimit = subscriptionPlan.creditLimit

  // 如果额度已满，不需要重置
  if (currentCredits >= creditLimit) {
    return false
  }

  // 计算剩余额度
  const remainingCredits = currentCredits

  // 根据不同时间段检查条件
  if (currentHour === 19) {
    // 19:00 时间窗口：额度 > minCreditsFor19 (严格大于)
    return remainingCredits > settings.scheduledReset.minCreditsFor19
  } else if (currentHour === 0) {
    // 00:00 时间窗口：额度 >= minCreditsFor00
    return remainingCredits >= settings.scheduledReset.minCreditsFor00
  } else {
    // 其他时间窗口：使用 00:00 的条件
    return remainingCredits >= settings.scheduledReset.minCreditsFor00
  }
}

/**
 * 执行定时重置检查
 */
async function performScheduledResetCheck() {
  console.log("[Background] 执行定时重置检查...")

  try {
    // 1. 获取设置
    const settings = await getSettings()

    // 2. 检查是否启用定时重置
    if (!settings.scheduledReset.enabled) {
      console.log("[Background] 定时重置未启用，跳过检查")
      return
    }

    // 3. 检查今日重置次数
    const resetData = await getTodayResetCount()
    if (resetData.count >= settings.scheduledReset.maxResetTimes) {
      console.log(`[Background] 今日已达到最大重置次数 (${resetData.count}/${settings.scheduledReset.maxResetTimes})，跳过检查`)
      return
    }

    // 4. 检查是否在任一时间窗口内
    const now = new Date()
    const currentHour = now.getHours()

    let inWindow = false
    let activeWindow = null

    for (const window of settings.scheduledReset.windows) {
      if (window.enabled && isInTimeWindow(window.hour, window.minute, window.randomMinutes)) {
        inWindow = true
        activeWindow = window
        break
      }
    }

    if (!inWindow) {
      console.log("[Background] 不在任何时间窗口内，跳过检查")
      return
    }

    console.log(`[Background] 在时间窗口内 (${activeWindow.hour}:${activeWindow.minute} ±${activeWindow.randomMinutes}分钟)`)

    // 5. 获取 Token
    const token = await getAuthToken()
    if (!token) {
      console.log("[Background] 未获取到认证 Token，跳过检查")
      return
    }

    // 6. 获取订阅列表
    const subscriptions = await getSubscriptions(token)
    if (subscriptions.length === 0) {
      console.log("[Background] 没有活跃的订阅，跳过检查")
      return
    }

    // 7. 检查每个订阅是否需要重置
    let resetCount = 0
    for (const subscription of subscriptions) {
      if (shouldResetSubscription(subscription, settings, currentHour)) {
        console.log(`[Background] 订阅 ${subscription.subscriptionPlanName} 满足重置条件，开始重置...`)

        try {
          const result = await resetCredits(subscription.id)
          if (result.success) {
            console.log(`[Background] 订阅 ${subscription.subscriptionPlanName} 重置成功`)
            resetCount++
          } else {
            console.error(`[Background] 订阅 ${subscription.subscriptionPlanName} 重置失败:`, result.message)
          }
        } catch (error) {
          console.error(`[Background] 订阅 ${subscription.subscriptionPlanName} 重置异常:`, error)
        }
      } else {
        console.log(`[Background] 订阅 ${subscription.subscriptionPlanName} 不满足重置条件 (额度: $${subscription.currentCredits.toFixed(2)})`)
      }
    }

    // 8. 更新重置次数
    if (resetCount > 0) {
      await incrementTodayResetCount()
      console.log(`[Background] 本次成功重置 ${resetCount} 个订阅`)
    }

  } catch (error) {
    console.error("[Background] 定时重置检查失败:", error)
  }
}

/**
 * 启动定时检查
 */
function startScheduledResetService() {
  console.log("[Background] 启动定时重置服务，检查间隔: 60秒")

  // 立即执行一次检查
  performScheduledResetCheck()

  // 设置定时检查
  setInterval(() => {
    performScheduledResetCheck()
  }, CHECK_INTERVAL)
}

// 启动服务
startScheduledResetService()

// 监听扩展安装/更新事件
browserAPI.runtime.onInstalled.addListener((details) => {
  console.log("[Background] Extension installed/updated:", details.reason)
  if (details.reason === "install") {
    console.log("[Background] First installation detected")
  } else if (details.reason === "update") {
    console.log("[Background] Extension updated")
  }
})

// 导出空对象以满足 TypeScript 模块要求
export {}
