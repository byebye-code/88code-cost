/**
 * 定时重置服务
 * 负责在固定时间自动重置套餐额度
 */

import type { Subscription } from "~/types"
import { resetCredits, fetchSubscriptions } from "~/lib/api/client"

// 定时重置配置
export const RESET_TIMES = {
  FIRST: { hour: 16, minute: 55, requiredResetTimes: 2 },  // 16:55，需要 ≥2 次
  SECOND: { hour: 23, minute: 55, requiredResetTimes: 1 }  // 23:55，需要 ≥1 次
} as const

// 随机延迟范围（秒）
const RANDOM_DELAY_RANGE = { min: 0, max: 15 }

// 验证延迟时间（秒）
const VERIFICATION_DELAY = 30

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

/**
 * 执行自动重置
 */
export async function executeScheduledReset(subscription: Subscription, requiredResetTimes: number): Promise<{
  success: boolean
  message: string
  verified?: boolean
}> {
  console.log(`[ScheduledReset] 开始执行定时重置，订阅ID: ${subscription.id}`)

  // 检查重置条件
  const checkResult = canReset(subscription, requiredResetTimes)
  if (!checkResult.canReset) {
    console.log(`[ScheduledReset] 不满足重置条件: ${checkResult.reason}`)
    return { success: false, message: checkResult.reason || "不满足重置条件" }
  }

  // 随机延迟（避免服务器压力）
  const randomDelay = Math.floor(
    Math.random() * (RANDOM_DELAY_RANGE.max - RANDOM_DELAY_RANGE.min + 1) + RANDOM_DELAY_RANGE.min
  )
  console.log(`[ScheduledReset] 随机延迟 ${randomDelay} 秒`)
  await new Promise(resolve => setTimeout(resolve, randomDelay * 1000))

  // 执行重置
  try {
    const resetResult = await resetCredits(subscription.id)

    if (!resetResult.success) {
      console.error(`[ScheduledReset] 重置失败:`, resetResult.message)
      return { success: false, message: resetResult.message || "重置失败" }
    }

    console.log(`[ScheduledReset] 重置成功，等待 ${VERIFICATION_DELAY} 秒后验证`)

    // 延迟验证
    await new Promise(resolve => setTimeout(resolve, VERIFICATION_DELAY * 1000))

    // 验证重置结果
    const verified = await verifyReset(subscription.id, subscription.subscriptionPlan.creditLimit)

    if (!verified) {
      console.error(`[ScheduledReset] 验证失败：重置可能未成功`)
      return {
        success: true, // API 调用成功
        message: "重置请求已发送，但验证失败",
        verified: false
      }
    }

    console.log(`[ScheduledReset] 验证成功`)
    return {
      success: true,
      message: "重置成功",
      verified: true
    }
  } catch (error) {
    console.error(`[ScheduledReset] 执行异常:`, error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "未知错误"
    }
  }
}

/**
 * 验证重置结果
 */
async function verifyReset(subscriptionId: number, expectedCredits: number): Promise<boolean> {
  try {
    const response = await fetchSubscriptions()

    if (!response.success || !response.data) {
      console.error(`[ScheduledReset] 验证失败：获取订阅信息失败`)
      return false
    }

    const subscription = response.data.find(sub => sub.id === subscriptionId)

    if (!subscription) {
      console.error(`[ScheduledReset] 验证失败：未找到订阅`)
      return false
    }

    // 验证逻辑：
    // 1. 额度已满 -> 成功
    // 2. 冷却时间重置 -> 成功
    // 3. 额度未满 + 有重置次数 + 冷却时间为0 -> 失败

    const isCreditsReset = subscription.currentCredits >= expectedCredits
    const isCooldownActive = subscription.lastCreditReset
      ? (Date.now() - new Date(subscription.lastCreditReset).getTime()) < 60 * 1000 // 1分钟内
      : false

    if (isCreditsReset || isCooldownActive) {
      return true
    }

    // 检查失败条件
    const hasResetTimes = subscription.resetTimes > 0
    const isNotFull = subscription.currentCredits < expectedCredits

    if (isNotFull && hasResetTimes && !isCooldownActive) {
      console.error(`[ScheduledReset] 验证失败：额度未满且无冷却，重置可能失败`)
      return false
    }

    // 其他情况认为成功（如重置次数已用完等）
    return true
  } catch (error) {
    console.error(`[ScheduledReset] 验证异常:`, error)
    return false
  }
}
