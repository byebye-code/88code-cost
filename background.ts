/**
 * Background Service Worker - 统一后台服务
 *
 * 功能1: 数据预取服务
 * - 每30秒后台获取数据
 * - 预加载到 storage 缓存
 * - 实现 popup 秒开体验
 *
 * 功能2: 定时重置服务
 * - 固定在 18:55 和 23:55 执行
 * - 智能判断重置策略
 */

import { Storage } from "@plasmohq/storage"

import {
  fetchDashboard,
  fetchLoginInfo,
  fetchSubscriptions,
  resetCredits
} from "~/lib/api/client"
import { browserAPI } from "~/lib/browser-api"
import {
  setCacheData,
  getAuthToken as getStorageAuthToken
} from "~/lib/storage"
import { backgroundLogger } from "~/lib/utils/logger"
import type {
  AppSettings,
  DashboardData,
  LoginInfo,
  Subscription
} from "~/types"
import { DEFAULT_SETTINGS } from "~/types"

const storage = new Storage()

// ============ 数据预取服务 ============

const ALARM_NAME_FETCH = "fetchAllData"
const FETCH_INTERVAL = 0.5 // 30秒（单位：分钟）

/**
 * 数据获取任务注册表
 */
const DATA_TASKS = {
  loginInfo: {
    name: "登录信息",
    cacheKey: "login_info_cache",
    handler: fetchLoginInfo
  },
  dashboard: {
    name: "Dashboard 数据",
    cacheKey: "dashboard_cache",
    handler: fetchDashboard
  },
  subscriptions: {
    name: "订阅数据",
    cacheKey: "subscriptions_cache",
    handler: fetchSubscriptions
  }
} as const

/**
 * 执行所有数据获取任务（并行）
 */
async function executeAllTasks() {
  backgroundLogger.info("开始执行数据获取任务...")
  const startTime = Date.now()

  const results = await Promise.allSettled([
    executeTask("loginInfo"),
    executeTask("dashboard"),
    executeTask("subscriptions")
  ])

  const successCount = results.filter(r => r.status === "fulfilled").length
  const duration = Date.now() - startTime
  backgroundLogger.info(`任务执行完成: ${successCount}/${results.length} 成功，耗时 ${duration}ms`)

  return results
}

/**
 * 执行单个数据获取任务
 */
async function executeTask(taskKey: keyof typeof DATA_TASKS) {
  const task = DATA_TASKS[taskKey]
  const taskStartTime = Date.now()

  try {
    backgroundLogger.info(`执行任务: ${task.name}`)
    const result = await task.handler()
    const taskDuration = Date.now() - taskStartTime

    if (result.success && result.data) {
      await setCacheData(task.cacheKey, result.data)
      backgroundLogger.info(`✅ ${task.name} 获取成功，耗时 ${taskDuration}ms`)
    } else {
      backgroundLogger.warn(`⚠️ ${task.name} 获取失败: ${result.message}`)
    }

    return result
  } catch (err) {
    backgroundLogger.error(`❌ ${task.name} 执行异常:`, err)
    throw err
  }
}

/**
 * 启动数据预取定时任务
 */
function startDataFetchService() {
  backgroundLogger.info("🚀 启动数据预取服务 (每30秒)")

  browserAPI.alarms.create(ALARM_NAME_FETCH, {
    delayInMinutes: FETCH_INTERVAL,
    periodInMinutes: FETCH_INTERVAL
  })
}

/**
 * 停止数据预取定时任务
 */
function stopDataFetchService() {
  backgroundLogger.info("⏹ 停止数据预取服务")
  browserAPI.alarms.clear(ALARM_NAME_FETCH)
}

// ============ 定时重置服务 ============

const SETTINGS_KEY = "app_settings"
const LAST_EXECUTION_KEY = "last_execution_time"

// 固定执行时间：18:55 和 23:55
const RESET_TIMES = [
  { hour: 18, minute: 55 },
  { hour: 23, minute: 55 }
]

// 检查间隔：每分钟
const CHECK_INTERVAL = 60 * 1000

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
    backgroundLogger.error("加载设置失败:", error)
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
      return result.data.filter(
        (sub: Subscription) => sub.subscriptionStatus === "活跃中" && sub.isActive === true
      )
    }
  } catch (err) {
    backgroundLogger.error("获取订阅列表失败:", err)
  }
  return []
}

/**
 * 检查当前时间是否在执行窗口
 */
function isInExecutionWindow(hour: number, minute: number): boolean {
  return RESET_TIMES.some(
    (time) => time.hour === hour && time.minute === minute
  )
}

/**
 * 判断套餐是否需要重置
 */
function shouldResetSubscription(
  subscription: Subscription,
  currentHour: number
): { shouldReset: boolean; reason: string } {
  const { currentCredits, resetTimes, subscriptionPlan } = subscription
  const creditLimit = subscriptionPlan.creditLimit

  // 1. 满额检查
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
    if (resetTimes <= 1) {
      return {
        shouldReset: false,
        reason: `保留最后1次重置机会给晚间 (剩余${resetTimes}次)`
      }
    }
    return {
      shouldReset: true,
      reason: `最大化利用重置窗口，剩余${resetTimes}次`
    }
  } else if (currentHour === 23) {
    // 23:55 - 兜底重置策略
    return {
      shouldReset: true,
      reason: `兜底重置，剩余${resetTimes}次`
    }
  }

  return { shouldReset: false, reason: "不在执行时间窗口" }
}

/**
 * 执行重置
 */
async function performReset(
  subscription: Subscription,
  reason: string
): Promise<void> {
  try {
    backgroundLogger.info(
      `开始重置订阅 ${subscription.subscriptionPlanName}`
    )
    backgroundLogger.info(`  原因：${reason}`)
    backgroundLogger.info(`  当前额度：${subscription.currentCredits}/${subscription.subscriptionPlan.creditLimit}`)
    backgroundLogger.info(`  剩余次数：${subscription.resetTimes}`)

    const result = await resetCredits(subscription.id)

    if (result.success) {
      backgroundLogger.info(`✓ 订阅 ${subscription.subscriptionPlanName} 重置成功`)
    } else {
      backgroundLogger.error(
        `✗ 订阅 ${subscription.subscriptionPlanName} 重置失败:`,
        result.message
      )
    }
  } catch (err) {
    backgroundLogger.error(
      `✗ 订阅 ${subscription.subscriptionPlanName} 重置异常:`,
      err
    )
  }
}

/**
 * 执行定时重置检查
 */
async function performScheduledResetCheck() {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const timeKey = `${currentHour}:${currentMinute}`

  backgroundLogger.info(`定时检查 - 当前时间: ${timeKey}`)

  try {
    // 1. 检查是否在执行窗口
    if (!isInExecutionWindow(currentHour, currentMinute)) {
      return
    }

    backgroundLogger.info(`✓ 在执行窗口内: ${timeKey}`)

    // 2. 获取设置
    const settings = await getSettings()

    // 3. 检查是否启用定时重置
    if (!settings.scheduledReset.enabled) {
      backgroundLogger.info("定时重置未启用，跳过")
      return
    }

    // 4. 检查是否已在本小时内执行过
    const lastExecution = await storage.get(LAST_EXECUTION_KEY)
    if (lastExecution) {
      const lastTime = JSON.parse(lastExecution)
      if (lastTime.hour === currentHour && lastTime.date === now.toDateString()) {
        backgroundLogger.info(`本小时 (${currentHour}:00) 已执行过，跳过`)
        return
      }
    }

    // 5. 获取 Token
    const token = await getAuthToken()
    if (!token) {
      backgroundLogger.info("未获取到认证 Token，跳过")
      return
    }

    // 6. 获取订阅列表
    const subscriptions = await getSubscriptions(token)
    if (subscriptions.length === 0) {
      backgroundLogger.info("没有活跃的订阅，跳过")
      return
    }

    backgroundLogger.info(`找到 ${subscriptions.length} 个活跃订阅，开始分析...`)

    // 7. 智能判断哪些订阅需要重置
    const resetTasks: Array<{ subscription: Subscription; reason: string }> = []
    const skipTasks: Array<{ subscription: Subscription; reason: string }> = []

    subscriptions.forEach((subscription) => {
      const { shouldReset, reason } = shouldResetSubscription(subscription, currentHour)

      if (shouldReset) {
        resetTasks.push({ subscription, reason })
        backgroundLogger.info(`✓ 将重置：${subscription.subscriptionPlanName} - ${reason}`)
      } else {
        skipTasks.push({ subscription, reason })
        backgroundLogger.info(`⊗ 跳过重置：${subscription.subscriptionPlanName} - ${reason}`)
      }
    })

    backgroundLogger.info(`统计：需重置 ${resetTasks.length} 个，跳过 ${skipTasks.length} 个`)

    // 8. 执行重置
    if (resetTasks.length > 0) {
      const resetPromises = resetTasks.map(({ subscription, reason }) => {
        return performReset(subscription, reason)
      })

      await Promise.all(resetPromises)
      backgroundLogger.info(`✓ 重置完成，共处理 ${resetTasks.length} 个订阅`)
    } else {
      backgroundLogger.info(`无需重置任何订阅`)
    }

    // 9. 记录执行时间
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

  } catch (err) {
    backgroundLogger.error("定时重置检查失败:", err)
  }
}

/**
 * 启动定时重置服务
 */
function startScheduledResetService() {
  backgroundLogger.info("启动定时重置服务")
  backgroundLogger.info(`执行时间: ${RESET_TIMES.map(t => `${t.hour}:${String(t.minute).padStart(2, '0')}`).join(", ")}`)
  backgroundLogger.info(`检查间隔: ${CHECK_INTERVAL / 1000}秒`)

  // 立即执行一次检查
  performScheduledResetCheck()

  // 设置定时检查（每分钟）
  setInterval(() => {
    performScheduledResetCheck()
  }, CHECK_INTERVAL)
}

// ============ 消息监听 ============

/**
 * 定时器回调
 */
browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME_FETCH) {
    backgroundLogger.info("⏰ 定时器触发，执行数据获取")
    executeAllTasks()
  }
})

/**
 * 监听来自 popup 的消息
 */
browserAPI.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // 手动刷新数据
  if (request.action === "refreshData") {
    backgroundLogger.info("收到手动刷新请求")
    executeAllTasks().then((results) => {
      const successCount = results.filter(r => r.status === "fulfilled").length
      backgroundLogger.info(`手动刷新完成: ${successCount}/${results.length} 成功`)
      sendResponse({ success: true, results })
    }).catch((err) => {
      backgroundLogger.error("手动刷新失败:", err)
      sendResponse({ success: false, error: err.message })
    })
    return true // 异步响应
  }

  // 更新图标状态（静默处理）
  if (request.action === "updateIcon") {
    return false
  }

  return false
})

// ============ 生命周期事件 ============

/**
 * 扩展启动时
 */
browserAPI.runtime.onStartup.addListener(() => {
  backgroundLogger.info("扩展启动")
  startDataFetchService()
  executeAllTasks()
})

/**
 * 扩展安装/更新时
 */
browserAPI.runtime.onInstalled.addListener((details) => {
  backgroundLogger.info(`扩展${details.reason === "install" ? "首次安装" : "已更新"}`)
  startDataFetchService()
  executeAllTasks()
})

/**
 * 扩展挂起时
 */
browserAPI.runtime.onSuspend.addListener(() => {
  backgroundLogger.info("扩展挂起")
  stopDataFetchService()
})

// ============ 初始化 ============

backgroundLogger.info("Service Worker 初始化完成")
backgroundLogger.info("✓ 数据预取服务：每30秒")
backgroundLogger.info("✓ 定时重置服务：18:55 和 23:55")

// 启动两个服务
startDataFetchService()
startScheduledResetService()

// 立即执行一次数据获取
executeAllTasks()

// 导出空对象以满足 TypeScript 模块要求
export {}
