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
import { shouldResetSubscription } from "~/lib/services/reset-strategy"
import { canReset } from "~/lib/services/scheduledReset"
import { browserAPI } from "~/lib/browser-api"
import {
  setCacheData,
  getAuthTokenFromStorage
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

// 固定执行窗口及策略
const RESET_WINDOWS = [
  { hour: 18, minute: 55, requiredResetTimes: 2, label: "evening" },
  { hour: 23, minute: 55, requiredResetTimes: 1, label: "night" }
] as const

type ResetWindow = typeof RESET_WINDOWS[number]

const RESET_ALARM_PREFIX = "scheduledReset"
const DAILY_MINUTES = 24 * 60
const RESET_WINDOW_DURATION_MS = 5 * 60 * 1000 // 5分钟窗口

function getResetAlarmName(hour: number, minute: number) {
  return `${RESET_ALARM_PREFIX}-${hour}-${minute}`
}

function getNextExecutionTimestamp(hour: number, minute: number) {
  const now = new Date()
  const target = new Date(now)
  target.setHours(hour, minute, 0, 0)

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }

  return target.getTime()
}

function getResetWindowByTime(hour: number, minute: number): ResetWindow | null {
  return RESET_WINDOWS.find(
    (window) => window.hour === hour && window.minute === minute
  ) ?? null
}

function getResetWindowFromTrigger(trigger?: string): ResetWindow | null {
  if (!trigger || !trigger.startsWith(RESET_ALARM_PREFIX)) {
    return null
  }

  const parts = trigger.split("-")
  if (parts.length < 3) return null

  const hour = Number(parts[1])
  const minute = Number(parts[2])

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return null
  }

  return getResetWindowByTime(hour, minute)
}

function getWindowStartDate(window: ResetWindow, reference: Date): Date {
  const start = new Date(reference)
  const referenceHour = reference.getHours()
  const referenceMinute = reference.getMinutes()

  if (
    referenceHour < window.hour ||
    (referenceHour === window.hour && referenceMinute < window.minute)
  ) {
    start.setDate(start.getDate() - 1)
  }

  start.setHours(window.hour, window.minute, 0, 0)
  return start
}

function hasResetThisWindow(subscription: Subscription, windowStart: Date): boolean {
  if (!subscription.lastCreditReset) {
    return false
  }
  const lastReset = new Date(subscription.lastCreditReset)
  return lastReset >= windowStart
}

function getWindowEndDate(windowStart: Date): Date {
  return new Date(windowStart.getTime() + RESET_WINDOW_DURATION_MS)
}

function scheduleCooldownAlarm(window: ResetWindow, cooldownEnd: Date) {
  const when = Math.max(cooldownEnd.getTime(), Date.now() + 1000)
  const alarmName = `${RESET_ALARM_PREFIX}Cooldown-${window.hour}-${window.minute}-${when}`
  backgroundLogger.info(
    `为窗口 ${window.hour}:${String(window.minute).padStart(2, "0")} 注册冷却闹钟 (${new Date(when).toLocaleTimeString()})`
  )
  browserAPI.alarms.create(alarmName, { when })
}

function scheduleResetAlarms() {
  RESET_WINDOWS.forEach(({ hour, minute, label }) => {
    const alarmName = getResetAlarmName(hour, minute)
    const nextRun = getNextExecutionTimestamp(hour, minute)

    backgroundLogger.info(
      `注册定时闹钟 ${alarmName} (${label}) -> ${new Date(nextRun).toLocaleString()}`
    )

    browserAPI.alarms.create(alarmName, {
      when: nextRun,
      periodInMinutes: DAILY_MINUTES
    })
  })
}

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
  return await getAuthTokenFromStorage()
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
 * 执行重置
 */
async function performReset(
  subscription: Subscription,
  reason: string,
  requiredResetTimes: number,
  windowStart?: Date | null
): Promise<void> {
  try {
    if (windowStart && hasResetThisWindow(subscription, windowStart)) {
      backgroundLogger.info(`⊗ ${subscription.subscriptionPlanName} 本时间窗口已重置，跳过`)
      return
    }

    const eligibility = canReset(subscription, requiredResetTimes)
    if (!eligibility.canReset) {
      backgroundLogger.info(
        `⊗ ${subscription.subscriptionPlanName} 校验未通过，跳过: ${eligibility.reason ?? "不满足重置条件"}`
      )
      return
    }

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
interface ScheduledResetOptions {
  skipWindowCheck?: boolean
  trigger?: string
}

async function performScheduledResetCheck(options: ScheduledResetOptions = {}) {
  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const timeKey = `${currentHour}:${currentMinute}`

  backgroundLogger.info(
    `定时检查 - 当前时间: ${timeKey} (触发: ${options.trigger ?? "unknown"})`
  )

  try {
    const windowFromTrigger = getResetWindowFromTrigger(options.trigger)
    const fallbackWindow = getResetWindowByTime(currentHour, currentMinute)
    const windowInfo = windowFromTrigger ?? fallbackWindow

    if (!windowInfo) {
      if (!options.skipWindowCheck) {
        backgroundLogger.info(`当前不在计划的重置窗口，跳过`)
      } else {
        backgroundLogger.warn("无法识别触发器对应的重置窗口，跳过执行")
      }
      return
    }

    if (
      !options.skipWindowCheck &&
      (windowInfo.hour !== currentHour || windowInfo.minute !== currentMinute)
    ) {
      backgroundLogger.info(`当前不在 ${windowInfo.hour}:${String(windowInfo.minute).padStart(2, "0")} 窗口内，跳过`)
      return
    }

    const windowLabel = `${windowInfo.hour}:${String(windowInfo.minute).padStart(2, "0")}`
    const windowStart = getWindowStartDate(windowInfo, now)
    const windowEnd = getWindowEndDate(windowStart)
    const requiredResetTimes = windowInfo.requiredResetTimes

    backgroundLogger.info(`✓ 在执行窗口内: ${windowLabel}`)

    // 2. 获取设置
    const settings = await getSettings()

    // 3. 检查是否启用定时重置
    if (!settings.scheduledReset.enabled) {
      backgroundLogger.info("定时重置未启用，跳过")
      return
    }

    // 4. 获取 Token
    const token = await getAuthToken()
    if (!token) {
      backgroundLogger.info("未获取到认证 Token，跳过")
      return
    }

    // 5. 获取订阅列表
    const subscriptions = await getSubscriptions(token)
    if (subscriptions.length === 0) {
      backgroundLogger.info("没有活跃的订阅，跳过")
      return
    }

    backgroundLogger.info(`找到 ${subscriptions.length} 个活跃订阅，开始分析...`)

    // 6. 智能判断哪些订阅需要重置
    const resetTasks: Array<{ subscription: Subscription; reason: string }> = []
    const skipTasks: Array<{ subscription: Subscription; reason: string }> = []

    subscriptions.forEach((subscription) => {
      const alreadyResetReason = windowStart && hasResetThisWindow(subscription, windowStart)
        ? "本窗口已完成重置"
        : null

      if (alreadyResetReason) {
        skipTasks.push({ subscription, reason: alreadyResetReason })
        backgroundLogger.info(`⊗ 跳过重置：${subscription.subscriptionPlanName} - ${alreadyResetReason}`)
        return
      }

      const strategyDecision = shouldResetSubscription(subscription, windowInfo.hour)
      if (!strategyDecision.shouldReset) {
        skipTasks.push({ subscription, reason: strategyDecision.reason })
        backgroundLogger.info(`⊗ 跳过重置：${subscription.subscriptionPlanName} - ${strategyDecision.reason}`)
        return
      }

      const eligibility = canReset(subscription, requiredResetTimes)
      if (!eligibility.canReset) {
        const reason = eligibility.reason ?? "不满足重置条件"
        if (eligibility.cooldownEnd) {
          const cooldownEndDate = new Date(eligibility.cooldownEnd)
          if (cooldownEndDate > now && cooldownEndDate <= windowEnd) {
            scheduleCooldownAlarm(windowInfo, cooldownEndDate)
            backgroundLogger.info(
              `⏳ ${subscription.subscriptionPlanName} 冷却将在窗口内结束（${cooldownEndDate.toLocaleTimeString()}），已预约复查`
            )
          }
        }
        skipTasks.push({ subscription, reason })
        backgroundLogger.info(`⊗ 跳过重置：${subscription.subscriptionPlanName} - ${reason}`)
        return
      }

      resetTasks.push({ subscription, reason: strategyDecision.reason })
      backgroundLogger.info(`✓ 将重置：${subscription.subscriptionPlanName} - ${strategyDecision.reason}`)
    })

    backgroundLogger.info(`统计：需重置 ${resetTasks.length} 个，跳过 ${skipTasks.length} 个`)

    // 7. 执行重置
    if (resetTasks.length > 0) {
      const resetPromises = resetTasks.map(({ subscription, reason }) => {
        return performReset(subscription, reason, requiredResetTimes, windowStart)
      })

      await Promise.all(resetPromises)
      backgroundLogger.info(`✓ 重置完成，共处理 ${resetTasks.length} 个订阅`)
    } else {
      backgroundLogger.info(`无需重置任何订阅`)
    }

  } catch (err) {
    backgroundLogger.error("定时重置检查失败:", err)
  }
}

/**
 * 启动定时重置服务
 */
function startScheduledResetService() {
  backgroundLogger.info("启动定时重置服务")
  backgroundLogger.info(`执行时间: ${RESET_WINDOWS.map(t => `${t.hour}:${String(t.minute).padStart(2, '0')}`).join(", ")}`)

  scheduleResetAlarms()
  performScheduledResetCheck({ trigger: "init" })
}

// ============ 消息监听 ============

/**
 * 定时器回调
 */
browserAPI.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME_FETCH) {
    backgroundLogger.info("⏰ 定时器触发，执行数据获取")
    executeAllTasks()
    return
  }

  if (alarm.name?.startsWith(RESET_ALARM_PREFIX)) {
    backgroundLogger.info(`⏰ 定时重置闹钟触发: ${alarm.name}`)
    performScheduledResetCheck({
      skipWindowCheck: true,
      trigger: alarm.name
    })
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
  // startDataFetchService()  // 已禁用：popup 直接调用 API
  startScheduledResetService()
  // executeAllTasks()  // 已禁用：popup 直接调用 API
})

/**
 * 扩展安装/更新时
 */
browserAPI.runtime.onInstalled.addListener((details) => {
  backgroundLogger.info(`扩展${details.reason === "install" ? "首次安装" : "已更新"}`)
  // startDataFetchService()  // 已禁用：popup 直接调用 API
  startScheduledResetService()
  // executeAllTasks()  // 已禁用：popup 直接调用 API
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
backgroundLogger.info("✓ Token 同步：通过 Content Script 从网站获取")
backgroundLogger.info("✓ 定时重置服务：18:55 和 23:55")
backgroundLogger.info("✓ 数据获取：popup 直接调用 API")

// 只启动定时重置服务
// startDataFetchService()  // 已禁用：popup 直接调用 API
startScheduledResetService()

// 不再立即执行数据获取
// executeAllTasks()  // 已禁用：popup 直接调用 API

// 导出空对象以满足 TypeScript 模块要求
export {}
