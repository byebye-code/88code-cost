/**
 * 套餐卡片组件
 * 显示单个套餐的信息
 */

import React, { useState, useEffect } from "react"

import type { Subscription } from "~/types"
import { resetCredits, toggleAutoReset } from "~/lib/api/client"
import { getResetCountdown } from "~/lib/utils/format"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import { Badge } from "~/components/ui/badge"
import { Button } from "~/components/ui/button"
import { Switch } from "~/components/ui/switch"
import { Progress } from "~/components/ui/progress"

interface SubscriptionCardProps {
  subscription: Subscription
  onRefresh?: () => void
}

export function SubscriptionCard({ subscription, onRefresh }: SubscriptionCardProps) {
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

  // 重置倒计时状态
  const [resetCountdown, setResetCountdown] = useState(
    getResetCountdown(subscription.lastCreditReset)
  )

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

  // 切换自动重置
  const handleToggleAutoReset = async () => {
    setIsTogglingAutoReset(true)
    setError(null)
    try {
      const newValue = !autoResetEnabled
      const result = await toggleAutoReset(subscription.id, newValue)
      if (result.success) {
        setAutoResetEnabled(newValue)
        console.log(`[SubscriptionCard] 自动重置已${newValue ? "启用" : "禁用"}`)
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
    try {
      const result = await resetCredits(subscription.id)
      if (result.success) {
        console.log(`[SubscriptionCard] 额度重置成功`)
        // 立即更新倒计时状态
        setResetCountdown(getResetCountdown(new Date().toISOString()))
        // 刷新数据
        if (onRefresh) {
          setTimeout(() => onRefresh(), 500)
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

        {/* 操作按钮区域 - 紧凑单行布局 */}
        <div className="space-y-2 border-t pt-2">
          {/* 错误提示 */}
          {error && (
            <div className="rounded-md bg-destructive/10 p-1.5">
              <p className="text-xs text-destructive">{error}</p>
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
      </CardContent>
    </Card>
  )
}
