/**
 * 定时重置倒计时 Hook
 * 提供下次重置时间和倒计时显示
 */

import { useEffect, useState } from "react"
import { getNextResetTime, getTimeUntilNextReset, formatCountdown } from "~/lib/services/scheduledReset"

export interface ScheduledResetCountdown {
  // 下次重置时间
  nextResetTime: Date | null
  // 需要的重置次数
  requiredResetTimes: number
  // 距离下次重置的毫秒数
  timeUntilReset: number
  // 格式化的倒计时字符串
  countdownText: string
  // 是否即将重置（3分钟内）
  isImminent: boolean
  // 是否正在重置时间窗口内（重置时间 ± 1分钟）
  isResetting: boolean
}

/**
 * 使用定时重置倒计时
 */
export function useScheduledResetCountdown(): ScheduledResetCountdown {
  const [countdown, setCountdown] = useState<ScheduledResetCountdown>(() => {
    const next = getNextResetTime()
    const timeUntil = getTimeUntilNextReset()

    return {
      nextResetTime: next?.time || null,
      requiredResetTimes: next?.requiredResetTimes || 0,
      timeUntilReset: timeUntil,
      countdownText: formatCountdown(timeUntil),
      isImminent: timeUntil <= 3 * 60 * 1000, // 3分钟
      isResetting: timeUntil <= 60 * 1000 && timeUntil >= -60 * 1000 // ±1分钟
    }
  })

  useEffect(() => {
    // 每秒更新倒计时
    const timer = setInterval(() => {
      const next = getNextResetTime()
      const timeUntil = getTimeUntilNextReset()

      setCountdown({
        nextResetTime: next?.time || null,
        requiredResetTimes: next?.requiredResetTimes || 0,
        timeUntilReset: timeUntil,
        countdownText: formatCountdown(timeUntil),
        isImminent: timeUntil <= 3 * 60 * 1000,
        isResetting: timeUntil <= 60 * 1000 && timeUntil >= -60 * 1000
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  return countdown
}
