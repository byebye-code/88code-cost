/**
 * 数字和时间格式化工具函数
 */

/**
 * 将大数字格式化为 K, M, B 等简化形式
 * @param num 数字
 * @param decimals 保留小数位数，默认2位
 * @param isInteger 是否为整数（如请求数），默认false
 * @returns 格式化后的字符串
 */
export function formatNumber(num: number, decimals: number = 2, isInteger: boolean = false): string {
  if (num < 1000) {
    return isInteger ? Math.floor(num).toString() : num.toFixed(decimals)
  }

  if (num < 1000000) {
    return (num / 1000).toFixed(decimals) + 'K'
  }

  if (num < 1000000000) {
    return (num / 1000000).toFixed(decimals) + 'M'
  }

  return (num / 1000000000).toFixed(decimals) + 'B'
}

/**
 * 计算重置倒计时
 * @param lastResetTime 上次重置时间
 * @param intervalHours 重置间隔小时数，默认5小时
 * @returns 倒计时信息
 */
export function getResetCountdown(
  lastResetTime: string | null,
  intervalHours: number = 5
): {
  canReset: boolean
  remainingTime: string
  remainingSeconds: number
} {
  if (!lastResetTime) {
    return {
      canReset: true,
      remainingTime: "可重置",
      remainingSeconds: 0
    }
  }

  const lastReset = new Date(lastResetTime).getTime()
  const now = new Date().getTime()
  const intervalMs = intervalHours * 60 * 60 * 1000
  const nextResetTime = lastReset + intervalMs
  const remaining = nextResetTime - now

  if (remaining <= 0) {
    return {
      canReset: true,
      remainingTime: "可重置",
      remainingSeconds: 0
    }
  }

  const remainingSeconds = Math.floor(remaining / 1000)
  const hours = Math.floor(remainingSeconds / 3600)
  const minutes = Math.floor((remainingSeconds % 3600) / 60)
  const seconds = remainingSeconds % 60

  let timeStr = ""
  if (hours > 0) {
    timeStr = `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    timeStr = `${minutes}分钟${seconds}秒`
  } else {
    timeStr = `${seconds}秒`
  }

  return {
    canReset: false,
    remainingTime: timeStr,
    remainingSeconds
  }
}
