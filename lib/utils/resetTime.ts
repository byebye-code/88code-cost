/**
 * 套餐重置时间计算工具
 *
 * 用于计算套餐的下次重置时间，支持：
 * 1. 从 API 返回的 resetDate 字段
 * 2. 根据 lastCreditReset + billingCycle 推算
 * 3. 固定时间点（18:55 和 23:55）
 */

import type { Subscription } from "~/types"

// 固定的重置时间点（小时:分钟）
const FIXED_RESET_TIMES = [
  { hour: 18, minute: 55 },
  { hour: 23, minute: 55 }
]

/**
 * 从套餐数据中提取下次重置时间
 *
 * 策略：
 * 1. 如果套餐有明确的 lastCreditReset，根据 billingCycle 计算下次重置
 * 2. 如果无法推算，返回今天或明天最近的固定重置时间点
 */
export function getNextResetTime(subscription: Subscription): Date | null {
  const now = new Date()

  // 策略 1: 根据 lastCreditReset 和 billingCycle 计算
  if (subscription.lastCreditReset) {
    const lastReset = new Date(subscription.lastCreditReset)
    const nextReset = calculateNextResetFromCycle(
      lastReset,
      subscription.billingCycle
    )

    if (nextReset && nextReset > now) {
      console.log(
        `[ResetTime] 套餐 ${subscription.subscriptionPlanName} 下次重置: ${nextReset.toLocaleString()}`
      )
      return nextReset
    }
  }

  // 策略 2: 使用固定的重置时间点（18:55 或 23:55）
  const nextFixedReset = getNextFixedResetTime(now)
  console.log(
    `[ResetTime] 套餐 ${subscription.subscriptionPlanName} 使用固定重置时间: ${nextFixedReset.toLocaleString()}`
  )
  return nextFixedReset
}

/**
 * 根据上次重置时间和计费周期计算下次重置时间
 */
function calculateNextResetFromCycle(
  lastReset: Date,
  billingCycle: string
): Date | null {
  const nextReset = new Date(lastReset)

  switch (billingCycle.toLowerCase()) {
    case "daily":
    case "每日":
      nextReset.setDate(nextReset.getDate() + 1)
      break
    case "weekly":
    case "每周":
      nextReset.setDate(nextReset.getDate() + 7)
      break
    case "monthly":
    case "每月":
      nextReset.setMonth(nextReset.getMonth() + 1)
      break
    case "yearly":
    case "每年":
      nextReset.setFullYear(nextReset.getFullYear() + 1)
      break
    default:
      // 无法识别的周期类型
      return null
  }

  return nextReset
}

/**
 * 获取下一个固定重置时间点（18:55 或 23:55）
 */
function getNextFixedResetTime(now: Date): Date {
  const today = new Date(now)
  today.setSeconds(0)
  today.setMilliseconds(0)

  // 检查今天的固定重置时间
  for (const time of FIXED_RESET_TIMES) {
    const resetTime = new Date(today)
    resetTime.setHours(time.hour)
    resetTime.setMinutes(time.minute)

    if (resetTime > now) {
      return resetTime
    }
  }

  // 今天的所有重置时间都过了，返回明天的第一个重置时间
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(FIXED_RESET_TIMES[0].hour)
  tomorrow.setMinutes(FIXED_RESET_TIMES[0].minute)
  return tomorrow
}

/**
 * 从套餐列表中提取所有需要在窗口内追踪的重置时间
 *
 * @param subscriptions 套餐列表
 * @param onlyInWindow 是否只返回在当前窗口内的重置时间
 * @returns 重置时间列表
 */
export function extractResetTimes(
  subscriptions: Subscription[],
  onlyInWindow: boolean = false
): Date[] {
  const now = new Date()
  const resetTimes: Date[] = []

  subscriptions.forEach((subscription) => {
    // 只处理活跃的套餐
    if (subscription.subscriptionStatus !== "活跃中" || !subscription.isActive) {
      return
    }

    const nextReset = getNextResetTime(subscription)
    if (nextReset) {
      if (onlyInWindow) {
        // 检查是否在重置窗口内
        if (isInResetWindow(nextReset)) {
          resetTimes.push(nextReset)
        }
      } else {
        resetTimes.push(nextReset)
      }
    }
  })

  // 去重并排序
  const uniqueTimes = Array.from(new Set(resetTimes.map((t) => t.getTime())))
    .map((t) => new Date(t))
    .sort((a, b) => a.getTime() - b.getTime())

  console.log(
    `[ResetTime] 提取到 ${uniqueTimes.length} 个重置时间:`,
    uniqueTimes.map((t) => t.toLocaleTimeString())
  )

  return uniqueTimes
}

/**
 * 检查时间是否在重置窗口内（18:55-19:00 或 23:55-00:00）
 */
function isInResetWindow(time: Date): boolean {
  const hour = time.getHours()
  const minute = time.getMinutes()

  // 18:55-19:00
  if (
    (hour === 18 && minute >= 55) ||
    (hour === 19 && minute === 0)
  ) {
    return true
  }

  // 23:55-00:00 (跨午夜)
  if (
    (hour === 23 && minute >= 55) ||
    (hour === 0 && minute === 0)
  ) {
    return true
  }

  return false
}

/**
 * 格式化剩余时间为可读字符串
 */
export function formatTimeRemaining(resetTime: Date): string {
  const now = new Date()
  const diff = resetTime.getTime() - now.getTime()

  if (diff <= 0) {
    return "已到期"
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 0) {
    return `${hours}时${minutes}分`
  } else if (minutes > 0) {
    return `${minutes}分${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}
