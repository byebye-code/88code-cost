/**
 * useResetWindowTracker Hook
 * 在固定的时间窗口内追踪套餐重置
 *
 * 时间窗口：
 * - 18:55:00 - 19:00:00
 * - 23:55:00 - 00:00:00
 *
 * 工作机制：
 * 1. 检测当前是否在重置窗口内
 * 2. 进入窗口时立即执行一次统一刷新（无延迟）
 * 3. 刷新后追踪窗口内的冷却时间
 * 4. 到达冷却结束时间后触发重置，不再重复检测
 */

import { useEffect, useRef, useState } from "react"
import { resetLogger } from "~/lib/utils/logger"

// 定义两个重置时间窗口
const RESET_WINDOWS = [
  { start: { hour: 18, minute: 55 }, end: { hour: 19, minute: 0 } },
  { start: { hour: 23, minute: 55 }, end: { hour: 23, minute: 59, second: 59 } }
]

interface ResetWindowTrackerConfig {
  enabled: boolean // 是否启用窗口追踪
  onResetTriggered: () => void // 重置触发时的回调
  onWindowStartRefresh: () => Promise<void> // 窗口开始时的刷新回调
  hasEligibleSubscriptions: () => boolean // 检查是否有符合规则的套餐（非PAYGO、活跃中、额度未满、有剩余重置次数）
  cooldownEndTimes?: Date[] // 需要追踪的冷却结束时间列表
}

interface WindowStatus {
  inWindow: boolean // 当前是否在窗口内
  nextWindowTime: Date | null // 下一个窗口的开始时间
}

export function useResetWindowTracker(config: ResetWindowTrackerConfig) {
  const [status, setStatus] = useState<WindowStatus>({
    inWindow: false,
    nextWindowTime: null
  })

  const resetTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map())
  const windowCheckTimerRef = useRef<NodeJS.Timeout>()
  const windowStartRefreshDoneRef = useRef<boolean>(false) // 标记窗口开始刷新是否已完成
  const lastWindowStartTimeRef = useRef<number>(0) // 记录上次窗口开始时间

  /**
   * 检查当前是否在任一重置窗口内
   */
  function isInResetWindow(now: Date): boolean {
    const hour = now.getHours()
    const minute = now.getMinutes()
    const second = now.getSeconds()

    for (const window of RESET_WINDOWS) {
      const startMatch =
        hour > window.start.hour ||
        (hour === window.start.hour && minute >= window.start.minute)

      const endMatch =
        hour < window.end.hour ||
        (hour === window.end.hour && minute < window.end.minute) ||
        (hour === window.end.hour &&
          minute === window.end.minute &&
          second <= (window.end.second || 0))

      // 特殊处理跨午夜的情况（23:55-00:00）
      if (window.start.hour > window.end.hour) {
        if (startMatch || (hour < window.end.hour || endMatch)) {
          return true
        }
      } else {
        if (startMatch && endMatch) {
          return true
        }
      }
    }

    return false
  }

  /**
   * 计算下一个窗口的开始时间
   */
  function getNextWindowTime(now: Date): Date {
    const today = new Date(now)
    today.setSeconds(0)
    today.setMilliseconds(0)

    for (const window of RESET_WINDOWS) {
      const windowStart = new Date(today)
      windowStart.setHours(window.start.hour)
      windowStart.setMinutes(window.start.minute)

      if (windowStart > now) {
        return windowStart
      }
    }

    // 如果今天所有窗口都过了，返回明天的第一个窗口
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(RESET_WINDOWS[0].start.hour)
    tomorrow.setMinutes(RESET_WINDOWS[0].start.minute)
    return tomorrow
  }

  /**
   * 检查冷却时间是否在当前窗口内
   */
  function isCooldownInCurrentWindow(cooldownEnd: Date, now: Date): boolean {
    // 检查冷却结束时间是否在当前时间之后
    if (cooldownEnd <= now) {
      return false
    }

    const hour = cooldownEnd.getHours()
    const minute = cooldownEnd.getMinutes()

    for (const window of RESET_WINDOWS) {
      const inWindow =
        (hour === window.start.hour && minute >= window.start.minute) ||
        (hour === window.end.hour && minute <= window.end.minute) ||
        (hour > window.start.hour && hour < window.end.hour)

      if (inWindow) {
        return true
      }
    }

    return false
  }

  /**
   * 设置重置追踪定时器
   */
  function trackResetTime(cooldownEnd: Date, now: Date) {
    const timeKey = cooldownEnd.toISOString()

    // 如果已经在追踪这个时间点，跳过
    if (resetTimersRef.current.has(timeKey)) {
      resetLogger.info(`已在追踪重置时间: ${cooldownEnd.toLocaleTimeString()}`)
      return
    }

    // 计算延迟时间（毫秒）
    const delay = cooldownEnd.getTime() - now.getTime()

    if (delay <= 0) {
      resetLogger.info("重置时间已过，立即触发重置")
      triggerReset(timeKey)
      return
    }

    resetLogger.info(
      `追踪重置时间: ${cooldownEnd.toLocaleTimeString()}，${Math.round(delay / 1000)} 秒后触发`
    )

    const timer = setTimeout(() => {
      resetLogger.info(`到达重置时间: ${cooldownEnd.toLocaleTimeString()}`)
      triggerReset(timeKey)
    }, delay)

    resetTimersRef.current.set(timeKey, timer)
  }

  /**
   * 触发重置
   * 到达冷却结束时间后，先进行预检查，再触发重置
   * 预检查确保：
   * 1. 仍有符合条件的套餐（非PAYGO、活跃中、额度未满、有剩余重置次数）
   * 2. 避免在所有套餐已手动重置或不符合条件时触发无效刷新
   */
  function triggerReset(timeKey: string) {
    resetLogger.info("到达冷却结束时间，执行预检查")

    // 预检查：确认是否仍有符合规则的套餐需要重置
    if (!config.hasEligibleSubscriptions()) {
      resetLogger.info("预检查失败：无符合规则的套餐，跳过重置")
      resetTimersRef.current.delete(timeKey)
      return
    }

    resetLogger.info("预检查通过，触发重置")
    config.onResetTriggered()
    // 清理定时器
    resetTimersRef.current.delete(timeKey)
  }

  /**
   * 检查窗口状态并追踪重置
   */
  async function checkWindowAndTrackResets() {
    if (!config.enabled) return

    const now = new Date()
    const inWindow = isInResetWindow(now)
    const nextWindow = getNextWindowTime(now)
    const wasInWindow = status.inWindow

    setStatus((prev) => ({
      ...prev,
      inWindow,
      nextWindowTime: nextWindow
    }))

    // 检测到刚进入窗口（从窗口外 → 窗口内）
    if (inWindow && !wasInWindow) {
      const currentWindowTime = now.getTime()

      // 检查是否是新的窗口（避免重复触发）
      if (currentWindowTime - lastWindowStartTimeRef.current > 60 * 1000) {
        lastWindowStartTimeRef.current = currentWindowTime
        windowStartRefreshDoneRef.current = false

        resetLogger.info("进入重置窗口，检查是否有符合规则的套餐")

        // 检查是否有符合规则的套餐（非PAYGO、活跃中）
        if (config.hasEligibleSubscriptions()) {
          resetLogger.info("检测到符合规则的套餐，立即执行统一刷新")

          // 立即执行窗口开始刷新
          ;(async () => {
            resetLogger.info("执行窗口开始的统一刷新")
            try {
              await config.onWindowStartRefresh()
              windowStartRefreshDoneRef.current = true
              resetLogger.info("窗口统一刷新完成，继续追踪剩余冷却时间")

              // 刷新后，重新检查并追踪剩余的冷却时间
              scheduleRemainingCooldowns()
            } catch (error) {
              resetLogger.error("窗口刷新失败:", error)
              windowStartRefreshDoneRef.current = true
            }
          })()
        } else {
          resetLogger.info("无符合规则的套餐，跳过窗口统一刷新")
          windowStartRefreshDoneRef.current = true
        }
      }
    }

    // 在窗口内且已完成窗口开始刷新，追踪冷却时间
    if (inWindow && windowStartRefreshDoneRef.current && config.cooldownEndTimes) {
      resetLogger.info("追踪窗口内的冷却时间")
      config.cooldownEndTimes.forEach((cooldownEnd) => {
        if (isCooldownInCurrentWindow(cooldownEnd, now)) {
          trackResetTime(cooldownEnd, now)
        }
      })
    }

    // 退出窗口时，重置标记
    if (!inWindow && wasInWindow) {
      resetLogger.info("退出重置窗口")
      windowStartRefreshDoneRef.current = false
      // 清理所有冷却追踪定时器
      resetTimersRef.current.forEach((timer) => clearTimeout(timer))
      resetTimersRef.current.clear()
    }

    // 计算下次检查的时间
    const nextCheckDelay = inWindow
      ? 10 * 1000 // 在窗口内，每10秒检查一次
      : Math.max(nextWindow.getTime() - now.getTime(), 60 * 1000) // 窗口外，等到下个窗口或最多1分钟

    windowCheckTimerRef.current = setTimeout(
      checkWindowAndTrackResets,
      nextCheckDelay
    )
  }

  /**
   * 调度剩余的冷却追踪（在窗口开始刷新后调用）
   */
  function scheduleRemainingCooldowns() {
    if (!config.cooldownEndTimes) return

    const now = new Date()
    resetLogger.info("调度剩余冷却时间")

    config.cooldownEndTimes.forEach((cooldownEnd) => {
      if (isCooldownInCurrentWindow(cooldownEnd, now)) {
        trackResetTime(cooldownEnd, now)
      }
    })
  }

  // 使用 ref 存储上次的 cooldownEndTimes，避免数组引用改变导致重复初始化
  const prevCooldownTimesRef = useRef<string>("")

  // 启动窗口检查
  useEffect(() => {
    if (!config.enabled) {
      resetLogger.info("窗口追踪已禁用")
      return
    }

    // 深度比较 cooldownEndTimes，避免数组引用改变但内容相同时重复初始化
    const currentTimesKey = JSON.stringify(
      config.cooldownEndTimes?.map((t) => t.getTime()).sort() || []
    )

    if (prevCooldownTimesRef.current === currentTimesKey) {
      // 时间数组内容未变化，跳过重新初始化
      return
    }

    prevCooldownTimesRef.current = currentTimesKey
    resetLogger.info("启动重置窗口追踪")
    checkWindowAndTrackResets()

    return () => {
      // 清理所有定时器
      if (windowCheckTimerRef.current) {
        clearTimeout(windowCheckTimerRef.current)
      }
      resetTimersRef.current.forEach((timer) => clearTimeout(timer))
      resetTimersRef.current.clear()
    }
  }, [config.enabled, config.cooldownEndTimes])

  return {
    inWindow: status.inWindow,
    nextWindowTime: status.nextWindowTime,
    trackedCount: resetTimersRef.current.size
  }
}
