import type { Subscription } from "~/types"

export interface ResetDecision {
  shouldReset: boolean
  reason: string
}

/**
 * 判断套餐是否需要重置
 * 18:55 优先策略：保留最后一次机会给夜间窗口
 * 23:55 兜底策略：确保每日重置
 */
export function shouldResetSubscription(
  subscription: Subscription,
  currentHour: number
): ResetDecision {
  const { currentCredits, resetTimes, subscriptionPlan } = subscription
  const creditLimit = subscriptionPlan.creditLimit

  if (currentCredits >= creditLimit) {
    return {
      shouldReset: false,
      reason: `已满额 (${currentCredits}/${creditLimit})`
    }
  }

  if (resetTimes <= 0) {
    return {
      shouldReset: false,
      reason: "无剩余重置次数"
    }
  }

  if (currentHour === 18) {
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
  }

  if (currentHour === 23) {
    return {
      shouldReset: true,
      reason: `兜底重置，剩余${resetTimes}次`
    }
  }

  return { shouldReset: false, reason: "不在执行时间窗口" }
}
