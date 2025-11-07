/**
 * Background Service - 定时重置功能
 * 固定在 18:55 和 23:55 执行，每个订阅随机延迟 0-15 秒
 * 图标状态：登录时彩色，未登录时灰色
 */

import { Storage } from "@plasmohq/storage"

import { browserAPI } from "~/lib/browser-api"
import type { AppSettings, Subscription } from "~/types"
import { DEFAULT_SETTINGS } from "~/types"
import { resetCredits } from "~/lib/api/client"
import { getAuthToken as getStorageAuthToken } from "~/lib/storage"

const storage = new Storage()
const SETTINGS_KEY = "app_settings"
const LAST_EXECUTION_KEY = "last_execution_time"

// 固定执行时间：18:55 和 23:55
const RESET_TIMES = [
  { hour: 18, minute: 55 },
  { hour: 23, minute: 55 }
]

// 每个订阅随机延迟 0-15 秒
const MAX_RANDOM_DELAY = 15 * 1000

// 检查间隔：每分钟
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
  return await getStorageAuthToken()
}

/**
 * 获取订阅列表
 */
async function getSubscriptions(token: string): Promise<Subscription[]> {
  try {
    const response = await fetch("https://www.88code.org/admin-api/cc-admin/system/subscription/my", {
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
      return result.data.filter(
        (sub: Subscription) => sub.subscriptionStatus === "活跃中" && sub.isActive === true
      )
    }
  } catch (error) {
    console.error("[Background] 获取订阅列表失败:", error)
  }
  return []
}

/**
 * 检查当前时间是否在执行窗口（18:55 或 23:55）
 */
function isInExecutionWindow(hour: number, minute: number): boolean {
  return RESET_TIMES.some(
    (time) => time.hour === hour && time.minute === minute
  )
}

/**
 * 生成随机延迟（0-15 秒）
 */
function getRandomDelay(): number {
  return Math.floor(Math.random() * (MAX_RANDOM_DELAY + 1))
}

/**
 * 判断套餐是否需要重置
 * @param subscription 套餐信息
 * @param currentHour 当前小时（18 或 23）
 * @returns 是否需要重置
 */
function shouldResetSubscription(
  subscription: Subscription,
  currentHour: number
): { shouldReset: boolean; reason: string } {
  const { currentCredits, resetTimes, subscriptionPlan } = subscription
  const creditLimit = subscriptionPlan.creditLimit

  // 1. 满额检查（无论什么时间都不重置满额套餐）
  if (currentCredits >= creditLimit) {
    return {
      shouldReset: false,
      reason: `已满额 (${currentCredits}/${creditLimit})`
    }
  }

  // 2. 没有重置次数
  if (resetTimes <= 0) {
    return {
      shouldReset: false,
      reason: `无剩余重置次数`
    }
  }

  // 3. 根据时间段判断
  if (currentHour === 18) {
    // 18:55 - 智能重置策略
    // 目标：最大化利用第二次重置的时间窗口（5小时间隔规则）
    // 条件：剩余次数 > 1 且当前不满额则强制重置
    if (resetTimes <= 1) {
      return {
        shouldReset: false,
        reason: `保留最后1次重置机会给晚间 (剩余${resetTimes}次)`
      }
    }

    // 剩余次数 > 1 且不满额，强制重置以最大化时间窗口
    return {
      shouldReset: true,
      reason: `最大化利用重置窗口，剩余${resetTimes}次`
    }
  } else if (currentHour === 23) {
    // 23:55 - 兜底重置策略
    // 条件：有剩余次数就重置（确保不浪费）
    return {
      shouldReset: true,
      reason: `兜底重置，剩余${resetTimes}次`
    }
  }

  return { shouldReset: false, reason: "不在执行时间窗口" }
}

/**
 * 执行重置（带随机延迟）
 */
async function performResetWithDelay(
  subscription: Subscription,
  delay: number,
  reason: string
): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(async () => {
      try {
        console.log(
          `[Background] 开始重置订阅 ${subscription.subscriptionPlanName}（延迟 ${(delay / 1000).toFixed(1)}s）`
        )
        console.log(`[Background]   原因：${reason}`)
        console.log(`[Background]   当前额度：${subscription.currentCredits}/${subscription.subscriptionPlan.creditLimit}`)
        console.log(`[Background]   剩余次数：${subscription.resetTimes}`)

        const result = await resetCredits(subscription.id)

        if (result.success) {
          console.log(`[Background] ✓ 订阅 ${subscription.subscriptionPlanName} 重置成功`)
        } else {
          console.error(
            `[Background] ✗ 订阅 ${subscription.subscriptionPlanName} 重置失败:`,
            result.message
          )
        }
      } catch (error) {
        console.error(
          `[Background] ✗ 订阅 ${subscription.subscriptionPlanName} 重置异常:`,
          error
        )
      }
      resolve()
    }, delay)
  })
}

/**
 * 执行定时重置检查
 */
async function performScheduledResetCheck() {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const timeKey = `${currentHour}:${currentMinute}`

  console.log(`[Background] 定时检查 - 当前时间: ${timeKey}`)

  try {
    // 1. 检查是否在执行窗口（18:55 或 23:55）
    if (!isInExecutionWindow(currentHour, currentMinute)) {
      return
    }

    console.log(`[Background] ✓ 在执行窗口内: ${timeKey}`)

    // 2. 获取设置
    const settings = await getSettings()

    // 3. 检查是否启用定时重置
    if (!settings.scheduledReset.enabled) {
      console.log("[Background] 定时重置未启用，跳过")
      return
    }

    // 4. 检查是否已在本小时内执行过（防止重复执行）
    const lastExecution = await storage.get(LAST_EXECUTION_KEY)
    if (lastExecution) {
      const lastTime = JSON.parse(lastExecution)
      if (lastTime.hour === currentHour && lastTime.date === now.toDateString()) {
        console.log(`[Background] 本小时 (${currentHour}:00) 已执行过，跳过`)
        return
      }
    }

    // 5. 获取 Token
    const token = await getAuthToken()
    if (!token) {
      console.log("[Background] 未获取到认证 Token，跳过")
      return
    }

    // 6. 获取订阅列表
    const subscriptions = await getSubscriptions(token)
    if (subscriptions.length === 0) {
      console.log("[Background] 没有活跃的订阅，跳过")
      return
    }

    console.log(`[Background] 找到 ${subscriptions.length} 个活跃订阅，开始分析...`)

    // 7. 智能判断哪些订阅需要重置
    const resetTasks: Array<{ subscription: Subscription; reason: string }> = []
    const skipTasks: Array<{ subscription: Subscription; reason: string }> = []

    subscriptions.forEach((subscription) => {
      const { shouldReset, reason } = shouldResetSubscription(subscription, currentHour)

      if (shouldReset) {
        resetTasks.push({ subscription, reason })
        console.log(`[Background] ✓ 将重置：${subscription.subscriptionPlanName} - ${reason}`)
      } else {
        skipTasks.push({ subscription, reason })
        console.log(`[Background] ⊗ 跳过重置：${subscription.subscriptionPlanName} - ${reason}`)
      }
    })

    console.log(`[Background] 统计：需重置 ${resetTasks.length} 个，跳过 ${skipTasks.length} 个`)

    // 8. 为需要重置的订阅分配随机延迟并执行
    if (resetTasks.length > 0) {
      const resetPromises = resetTasks.map(({ subscription, reason }) => {
        const delay = getRandomDelay()
        return performResetWithDelay(subscription, delay, reason)
      })

      await Promise.all(resetPromises)
      console.log(`[Background] ✓ 重置完成，共处理 ${resetTasks.length} 个订阅`)
    } else {
      console.log(`[Background] 无需重置任何订阅`)
    }

    // 9. 记录执行时间（防止重复执行）
    await storage.set(
      LAST_EXECUTION_KEY,
      JSON.stringify({
        hour: currentHour,
        date: now.toDateString(),
        timestamp: now.toISOString(),
        resetCount: resetTasks.length,
        skipCount: skipTasks.length
      })
    )

  } catch (error) {
    console.error("[Background] 定时重置检查失败:", error)
  }
}

/**
 * 启动定时检查服务
 */
function startScheduledResetService() {
  console.log("[Background] 启动定时重置服务")
  console.log(`[Background] 执行时间: ${RESET_TIMES.map(t => `${t.hour}:${String(t.minute).padStart(2, '0')}`).join(", ")}`)
  console.log(`[Background] 随机延迟: 0-${MAX_RANDOM_DELAY / 1000}秒`)
  console.log(`[Background] 检查间隔: ${CHECK_INTERVAL / 1000}秒`)

  // 立即执行一次检查
  performScheduledResetCheck()

  // 设置定时检查（每分钟）
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
    console.log("[Background] 首次安装")
  } else if (details.reason === "update") {
    console.log("[Background] 扩展已更新")
  }
})


// 导出空对象以满足 TypeScript 模块要求
export {}
