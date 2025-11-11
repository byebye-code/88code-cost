/**
 * 定时重置服务
 * 负责在固定时间自动重置套餐额度
 */

import type { Subscription } from "~/types"

// 定时重置配置
export const RESET_TIMES = {
  FIRST: { hour: 18, minute: 55, requiredResetTimes: 2 },  // 18:55，需要 ≥2 次
  SECOND: { hour: 23, minute: 55, requiredResetTimes: 1 }  // 23:55，需要 ≥1 次
} as const

/**
 * 获取今天的重置时间点
 */
export function getTodayResetTimes(): Date[] {
  const now = new Date()
  const times: Date[] = []

  // 16:55
  const firstReset = new Date(now)
  firstReset.setHours(RESET_TIMES.FIRST.hour, RESET_TIMES.FIRST.minute, 0, 0)
  times.push(firstReset)

  // 23:55
  const secondReset = new Date(now)
  secondReset.setHours(RESET_TIMES.SECOND.hour, RESET_TIMES.SECOND.minute, 0, 0)
  times.push(secondReset)

  return times
}

/**
 * 获取下一个重置时间点
 */
export function getNextResetTime(): { time: Date; requiredResetTimes: number } | null {
  const now = new Date()
  const todayResets = getTodayResetTimes()

  // 找到今天未来的重置时间点
  for (let i = 0; i < todayResets.length; i++) {
    if (todayResets[i] > now) {
      const timeConfig = i === 0 ? RESET_TIMES.FIRST : RESET_TIMES.SECOND
      return {
        time: todayResets[i],
        requiredResetTimes: timeConfig.requiredResetTimes
      }
    }
  }

  // 如果今天没有了，返回明天的第一个时间点
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(RESET_TIMES.FIRST.hour, RESET_TIMES.FIRST.minute, 0, 0)

  return {
    time: tomorrow,
    requiredResetTimes: RESET_TIMES.FIRST.requiredResetTimes
  }
}

/**
 * 计算距离下次重置的时间（毫秒）
 */
export function getTimeUntilNextReset(): number {
  const next = getNextResetTime()
  if (!next) return 0

  return next.time.getTime() - Date.now()
}

/**
 * 格式化倒计时显示
 */
export function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "即将重置"

  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}天${hours % 24}时`
  } else if (hours > 0) {
    return `${hours}时${minutes % 60}分`
  } else if (minutes > 0) {
    return `${minutes}分${seconds % 60}秒`
  } else {
    return `${seconds}秒`
  }
}

/**
 * 检查是否满足重置条件
 */
export function canReset(subscription: Subscription, requiredResetTimes: number): {
  canReset: boolean
  reason?: string
} {
  const { currentCredits, subscriptionPlan, resetTimes, lastCreditReset } = subscription
  const creditLimit = subscriptionPlan.creditLimit

  // PAYGO 套餐不支持定时重置
  if (subscription.subscriptionPlanName === "PAYGO") {
    return { canReset: false, reason: "PAYGO 套餐不支持定时重置" }
  }

  // 检查额度是否满额
  if (currentCredits >= creditLimit) {
    return { canReset: false, reason: "额度已满" }
  }

  // 检查重置次数
  if (resetTimes < requiredResetTimes) {
    return { canReset: false, reason: `重置次数不足（需要 ${requiredResetTimes} 次，当前 ${resetTimes} 次）` }
  }

  // 检查冷却时间（24小时）
  if (lastCreditReset) {
    const lastResetTime = new Date(lastCreditReset).getTime()
    const cooldownTime = 24 * 60 * 60 * 1000 // 24小时
    const timeSinceLastReset = Date.now() - lastResetTime

    if (timeSinceLastReset < cooldownTime) {
      const remainingCooldown = cooldownTime - timeSinceLastReset
      const remainingHours = Math.ceil(remainingCooldown / (60 * 60 * 1000))
      return { canReset: false, reason: `冷却中（剩余 ${remainingHours} 小时）` }
    }
  }

  return { canReset: true }
}
