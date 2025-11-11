/**
 * 套餐卡片组件
 * 显示单个套餐的信息
 */

import React, { useState, useEffect, useRef } from "react"

import type { Subscription } from "~/types"
import { resetCredits, toggleAutoReset } from "~/lib/api/client"
import { getResetCountdown } from "~/lib/utils/format"
import { useScheduledResetCountdown } from "~/hooks/useScheduledResetCountdown"
import { canReset } from "~/lib/services/scheduledReset"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Switch } from "~/components/ui/switch"
import { Progress } from "~/components/ui/progress"
import type { PaygoUsageStats } from "~/hooks/usePaygoUsageStats"

interface SubscriptionCardProps {
  subscription: Subscription
  onRefresh?: () => void
  paygoUsageStats?: PaygoUsageStats
  paygoUsageLoading?: boolean
  paygoUsageError?: string | null
}

export function SubscriptionCard({
  subscription,
  onRefresh,
  paygoUsageStats,
  paygoUsageLoading,
  paygoUsageError
}: SubscriptionCardProps) {
  const { subscriptionPlan } = subscription
  const creditLimit = subscriptionPlan.creditLimit
  const currentCredits = subscription.currentCredits
  // 剩余额度百分比（递减）
  const remainingPercentage =
    creditLimit > 0 ? ((currentCredits / creditLimit) * 100).toFixed(1) : 0

  // 状态管理
  const [autoResetEnabled, setAutoResetEnabled] = useState(subscription.autoResetWhenZero || false)
  const [isTogglingAutoReset, setIsTogglingAutoReset] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // 定时重置倒计时
  const scheduledCountdown = useScheduledResetCountdown()

  // 手动重置倒计时状态
  const [resetCountdown, setResetCountdown] = useState(
    getResetCountdown(subscription.lastCreditReset)
  )

  // 检查是否满足定时重置条件
  const scheduledResetCheck = canReset(subscription, scheduledCountdown.requiredResetTimes)

  // 每秒更新倒计时
  useEffect(() => {
    const timer = setInterval(() => {
      setResetCountdown(getResetCountdown(subscription.lastCreditReset))
    }, 1000)

    return () => clearInterval(timer)
  }, [subscription.lastCreditReset])

  // 同步自动重置状态
  useEffect(() => {
    setAutoResetEnabled(subscription.autoResetWhenZero || false)
  }, [subscription.autoResetWhenZero])

  // 自动清除成功消息（3秒后）
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)

      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // 切换自动重置
  const handleToggleAutoReset = async () => {
    setIsTogglingAutoReset(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const newValue = !autoResetEnabled
      const result = await toggleAutoReset(subscription.id, newValue)
      if (result.success) {
        setAutoResetEnabled(newValue)
        const message = `自动重置已${newValue ? "启用" : "禁用"}`
        setSuccessMessage(message)
        console.log(`[SubscriptionCard] ${message}`)
        // 刷新数据
        if (onRefresh) {
          setTimeout(() => onRefresh(), 500)
        }
      } else {
        setError(result.message || "操作失败")
        console.error(`[SubscriptionCard] 切换自动重置失败:`, result.message)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知错误"
      setError(errorMsg)
      console.error(`[SubscriptionCard] 切换自动重置异常:`, err)
    } finally {
      setIsTogglingAutoReset(false)
    }
  }

  // 手动重置额度
  const handleManualReset = async () => {
    // 如果不能重置，直接返回
    if (!resetCountdown.canReset) {
      return
    }

    // 如果剩余额度为100%，不允许重置
    if (currentCredits === creditLimit) {
      return
    }

    if (!confirm("确定要重置此套餐的额度吗？")) {
      return
    }
    setIsResetting(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const result = await resetCredits(subscription.id)
      if (result.success) {
        setSuccessMessage("额度重置成功")
        console.log(`[SubscriptionCard] 额度重置成功`)
        // 立即更新倒计时状态
        setResetCountdown(getResetCountdown(new Date().toISOString()))
        // 刷新数据（优化为800ms）
        if (onRefresh) {
          setTimeout(() => onRefresh(), 800)
        }
      } else {
        setError(result.message || "重置失败")
        console.error(`[SubscriptionCard] 重置额度失败:`, result.message)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "未知错误"
      setError(errorMsg)
      console.error(`[SubscriptionCard] 重置额度异常:`, err)
    } finally {
      setIsResetting(false)
    }
  }

  const getCountdown = (endDate: string) => {
    const now = new Date()
    const end = new Date(endDate)
    const diff = end.getTime() - now.getTime()

    if (diff <= 0) return "已过期"

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) {
      return `剩余 ${days}天`
    }
    return `剩余 ${hours}小时`
  }

  const getStatusVariant = (status: string): "success" | "destructive" | "secondary" | "info" => {
    switch (status) {
      case "活跃中":
        return "success"
      case "已过期":
        return "destructive"
      case "已禁用":
        return "secondary"
      default:
        return "info"
    }
  }

  // 根据剩余额度百分比返回渐变色（递减：剩余越少越红）
  const getProgressGradient = (remaining: number) => {
    if (remaining < 10) {
      // 剩余 < 10%: 红色渐变（危险）
      return "bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700"
    } else if (remaining < 20) {
      // 剩余 10-20%: 橙红渐变（警告）
      return "bg-gradient-to-r from-orange-500 to-red-500 dark:from-orange-600 dark:to-red-600"
    } else if (remaining < 40) {
      // 剩余 20-40%: 黄橙渐变（注意）
      return "bg-gradient-to-r from-yellow-500 to-orange-500 dark:from-yellow-600 dark:to-orange-600"
    } else {
      // 剩余 >= 40%: 绿色渐变（安全）
      return "bg-gradient-to-r from-green-500 to-green-600 dark:from-green-600 dark:to-green-700"
    }
  }

  // 根据剩余额度返回文字颜色
  const getTextColor = (remaining: number) => {
    if (remaining < 10) {
      return "text-red-600 dark:text-red-400"
    } else if (remaining < 20) {
      return "text-orange-600 dark:text-orange-400"
    } else if (remaining < 40) {
      return "text-yellow-600 dark:text-yellow-400"
    } else {
      return "text-green-600 dark:text-green-400"
    }
  }

  const isPaygo = subscription.subscriptionPlanName.includes("PAYGO")
  const PAYGO_BASE_DAYS = 30
  const paygoReference = (() => {
    if (!paygoUsageStats?.hasData) return null
    const available = paygoUsageStats.availableDays
    if (available >= 30) return { days: 30, avg: paygoUsageStats.avg30 }
    if (available >= 15) return { days: 15, avg: paygoUsageStats.avg15 }
    if (available >= 7) return { days: 7, avg: paygoUsageStats.avg7 }
    if (available >= 3) return { days: 3, avg: paygoUsageStats.avg3 }
    return null
  })()

  const paygoAvgDailyCost = paygoReference?.avg ?? 0
  const paygoReferenceDays = paygoReference?.days ?? 0

  const paygoDaysRemaining =
    isPaygo && paygoAvgDailyCost > 0 ? subscription.currentCredits / paygoAvgDailyCost : null

  const paygoProgressRatio = paygoDaysRemaining
    ? Math.min(paygoDaysRemaining, PAYGO_BASE_DAYS) / PAYGO_BASE_DAYS
    : 0

  const barRef = useRef<HTMLDivElement>(null)
  const [paygoHover, setPaygoHover] = useState({
    visible: false,
    day: 0,
    cost: 0,
    left: 0
  })

  const handlePaygoMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!barRef.current) return
    const rect = barRef.current.getBoundingClientRect()
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    const day = ratio * PAYGO_BASE_DAYS
    const cost = paygoAvgDailyCost * day
    setPaygoHover({
      visible: true,
      day,
      cost,
      left: ratio * 100
    })
  }

  const handlePaygoMouseLeave = () => {
    setPaygoHover((prev) => ({ ...prev, visible: false }))
  }

  const PAYGO_MARKERS = [
    { day: 3, key: "avg3", label: "3d" },
    { day: 7, key: "avg7", label: "7d" },
    { day: 15, key: "avg15", label: "15d" },
    { day: 30, key: "avg30", label: "30d" }
  ] as const

  return (
    <Card className="group transition-all duration-300 hover:shadow-md">
      <CardHeader className="p-4 pb-3">
        {/* 精简的头部 */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">
              {subscription.subscriptionPlanName}
            </h3>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant={getStatusVariant(subscription.subscriptionStatus)}>
                {subscription.subscriptionStatus}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {subscription.billingCycleDesc}
              </span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {getCountdown(subscription.endDate)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {/* PAYGO 套餐：余额制展示 */}
        {isPaygo ? (
          <div className="space-y-3">
            {/* 账户余额 - 精简单行设计 */}
            <div className="flex items-baseline justify-between rounded-lg border border-gray-200 bg-white/80 px-3 py-2 dark:border-gray-800 dark:bg-gray-900/60">
              <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                可用余额
              </span>
              <span className="text-2xl font-semibold text-gray-900 dark:text-white">
                ${currentCredits.toFixed(2)}
              </span>
            </div>

            {/* PAYGO 余额可用天数 */}
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/70 px-3 py-3 dark:border-gray-700 dark:bg-gray-900/40">
              {paygoUsageLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">正在计算最近用量...</p>
              ) : paygoUsageError ? (
                <p className="text-sm text-red-500 dark:text-red-300">{paygoUsageError}</p>
              ) : paygoReference ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span>预计可用
                      <strong className="ml-1 text-green-600 dark:text-green-400">
                        {paygoDaysRemaining.toFixed(1)} 天
                      </strong>
                    </span>
                    {paygoAvgDailyCost > 0 && (
                      <span>日均 ${paygoAvgDailyCost.toFixed(2)}</span>
                    )}
                  </div>

                  <div
                    className="relative h-3.5 rounded-full bg-gray-200 dark:bg-gray-800"
                    ref={barRef}
                    onMouseMove={handlePaygoMouseMove}
                    onMouseLeave={handlePaygoMouseLeave}
                  >
                    <div
                      className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-green-500 via-amber-400 to-rose-500"
                      style={{ width: `${paygoProgressRatio * 100}%` }}
                    />
                    {PAYGO_MARKERS.map((marker) => (
                      <div
                        key={marker.day}
                        className="group absolute top-0 h-full w-px bg-gray-400 dark:bg-gray-600"
                        style={{ left: `${(marker.day / PAYGO_BASE_DAYS) * 100}%` }}
                      >
                        <span className={`absolute -top-4 -translate-x-1/2 text-[11px] ${
                          paygoReferenceDays >= marker.day
                            ? "text-gray-700 dark:text-gray-200"
                            : "text-gray-400 dark:text-gray-600"
                        }`}>
                          {marker.label}
                        </span>
                      </div>
                    ))}
                    {paygoHover.visible && (
                      <div
                        className="pointer-events-none absolute -top-10 w-32 -translate-x-1/2 rounded-md bg-gray-900/90 px-2 py-1 text-center text-[11px] text-white shadow dark:bg-black/80"
                        style={{ left: `${paygoHover.left}%` }}
                      >
                        ≈ {paygoHover.day.toFixed(1)}d · ${paygoHover.cost.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
                    <span>0d</span>
                    <span>30d</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {!paygoUsageStats?.hasData
                    ? "暂无消费数据"
                    : paygoUsageStats.availableDays < 3
                    ? `数据不足（当前 ${paygoUsageStats.availableDays} 天，需至少 3 天）`
                    : "近 3 天内几乎没有消耗，暂无法计算趋势"}
                </p>
              )}
            </div>
          </div>
        ) : (
          /* 常规套餐：配额制展示 */
          <>
            {/* 单行额度展示 - 无边框 */}
            <div className="flex items-baseline justify-between">
              {/* 重置次数显示 */}
              {subscription.resetTimes > 0 && (
                <Badge variant="outline" className="text-xs">
                  ×{subscription.resetTimes}
                </Badge>
              )}
              <span className={`text-sm font-semibold ${subscription.resetTimes === 0 ? 'ml-auto' : ''}`}>
                <span className="text-primary">${currentCredits.toFixed(2)}</span>
                <span className="mx-1 text-muted-foreground">/</span>
                <span className="text-foreground">${creditLimit.toFixed(2)}</span>
              </span>
            </div>

            {/* 剩余额度和进度条 */}
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-muted-foreground">剩余额度</span>
                <span className={`font-semibold ${getTextColor(Number(remainingPercentage))}`}>
                  {remainingPercentage}%
                </span>
              </div>
              <Progress
                value={Number(remainingPercentage)}
                max={100}
                indicatorClassName={getProgressGradient(Number(remainingPercentage))}
                className="h-2"
              />
            </div>
          </>
        )}

        {/* 定时重置倒计时提醒 - 仅在3分钟内显示 */}
        {/* 注意：倒计时是全局的（在 popup.tsx 中通过 useScheduledResetCountdown 统一管理） */}
        {/* PAYGO 套餐不参与定时重置，已在 hasEligibleSubscriptions 中被过滤 */}
        {!isPaygo && scheduledCountdown.isImminent && (
          <div className="relative overflow-hidden rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-700 px-3 py-2">
            {/* 光效背景 */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.3),rgba(255,255,255,0))]" />

            {/* 内容 */}
            <div className="relative flex items-center justify-between">
              <span className="text-sm font-semibold tracking-wide text-white drop-shadow-lg">
                定时重置倒计时
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tabular-nums text-white drop-shadow-lg">
                  {Math.floor(scheduledCountdown.timeUntilReset / 1000)}
                </span>
                <span className="text-xs font-medium text-white/80">秒</span>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮区域 - 紧凑单行布局（PAYGO 套餐不显示） */}
        {!isPaygo && (
          <div className="space-y-2 border-t pt-2">
            {/* 错误提示 */}
            {error && (
              <div className="rounded-md bg-destructive/10 p-1.5">
                <p className="text-xs text-destructive">{error}</p>
              </div>
            )}

            {/* 成功提示 */}
            {successMessage && (
              <div className="rounded-md bg-green-500/10 p-1.5">
                <p className="text-xs text-green-600 dark:text-green-400">{successMessage}</p>
              </div>
            )}

            {/* 自动重置和手动重置 - 单行 */}
            <div className="flex items-center gap-2">
              {/* 自动重置开关 */}
              <div className="flex flex-1 items-center justify-between rounded-md bg-muted/50 px-2 py-1.5">
                <span className="text-xs font-medium">
                  自动重置
                </span>
                <Switch
                  checked={autoResetEnabled}
                  onCheckedChange={handleToggleAutoReset}
                  disabled={isTogglingAutoReset}
                  aria-label="切换自动重置"
                />
              </div>

              {/* 手动重置按钮 - 紧凑版 */}
              <Button
                onClick={handleManualReset}
                disabled={isResetting || !resetCountdown.canReset || currentCredits === creditLimit || subscription.resetTimes === 0}
                size="sm"
                variant={resetCountdown.canReset && currentCredits !== creditLimit && subscription.resetTimes > 0 ? "default" : "secondary"}
                className="flex-1 text-xs">
                {isResetting ? (
                  <span>重置中...</span>
                ) : (
                  <span>
                    {subscription.resetTimes === 0
                      ? "无重置次数"
                      : currentCredits === creditLimit
                        ? "额度已满"
                        : resetCountdown.canReset
                          ? "手动重置"
                          : `${resetCountdown.remainingTime}`}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
