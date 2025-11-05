/**
 * 套餐卡片组件
 * 显示单个套餐的信息
 */

import React, { useState, useEffect } from "react"

import type { Subscription } from "~/types"
import { resetCredits, toggleAutoReset } from "~/lib/api/client"
import { getResetCountdown } from "~/lib/utils/format"

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "活跃中":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "已过期":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "已禁用":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
      default:
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
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
    <div className="group rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm transition-all duration-300 hover:shadow-md dark:border-gray-700 dark:from-gray-800 dark:to-gray-850">
      {/* 精简的头部 */}
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {subscription.subscriptionPlanName}
          </h3>
          <div className="mt-0.5 flex items-center space-x-2">
            <span
              className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                subscription.subscriptionStatus
              )}`}>
              {subscription.subscriptionStatus}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {subscription.billingCycleDesc}
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{getCountdown(subscription.endDate)}</span>
        </div>
      </div>

      {/* 单行额度展示 */}
      <div className="mb-3 rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
        <div className="flex items-baseline justify-between">
          {/* 重置次数显示 */}
          {subscription.resetTimes > 0 && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              ×{subscription.resetTimes}
            </span>
          )}
          <span className={`text-sm font-semibold text-gray-900 dark:text-white ${subscription.resetTimes === 0 ? 'ml-auto' : ''}`}>
            <span className="text-blue-600 dark:text-blue-400">${currentCredits.toFixed(2)}</span>
            <span className="mx-1 text-gray-400">/</span>
            <span className="text-gray-700 dark:text-gray-300">${creditLimit.toFixed(2)}</span>
          </span>
        </div>
      </div>

      {/* 剩余额度和进度条 - 紧凑版 */}
      <div className="mb-2">
        <div className="mb-1 flex justify-between text-xs">
          <span className="text-gray-500 dark:text-gray-400">剩余额度</span>
          <span className={`font-semibold ${getTextColor(Number(remainingPercentage))}`}>
            {remainingPercentage}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className={`h-full transition-all duration-500 ease-in-out ${getProgressGradient(Number(remainingPercentage))}`}
            style={{ width: `${remainingPercentage}%` }}
          />
        </div>
      </div>

      {/* 操作按钮区域 - 紧凑版 */}
      <div className="space-y-2 border-t border-gray-200 pt-2 dark:border-gray-700">
        {/* 错误提示 */}
        {error && (
          <div className="rounded-md bg-red-50 p-1.5 dark:bg-red-900/20">
            <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* 自动重置开关 - 精简版 */}
        <div className="flex items-center justify-between rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            额度为0自动重置
          </span>
          <button
            onClick={handleToggleAutoReset}
            disabled={isTogglingAutoReset}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 ${
              autoResetEnabled
                ? "bg-gradient-to-r from-blue-500 to-blue-600"
                : "bg-gray-200 dark:bg-gray-600"
            }`}
            aria-label="切换自动重置">
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                autoResetEnabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* 手动重置按钮 - 带倒计时和重置次数 */}
        <button
          onClick={handleManualReset}
          disabled={isResetting || !resetCountdown.canReset || currentCredits === creditLimit}
          className={`flex w-full items-center justify-center space-x-1.5 rounded-md px-3 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 active:scale-95 ${
            resetCountdown.canReset && currentCredits !== creditLimit
              ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 hover:shadow-md dark:from-purple-600 dark:to-purple-700"
              : "cursor-not-allowed bg-gray-400 dark:bg-gray-600"
          } disabled:opacity-50`}>
          {isResetting ? (
            <>
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>重置中...</span>
            </>
          ) : (
            <>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>
                {currentCredits === creditLimit
                  ? "额度已满"
                  : resetCountdown.canReset
                    ? "手动重置"
                    : `重置冷却: ${resetCountdown.remainingTime}`}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
