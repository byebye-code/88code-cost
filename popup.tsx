import "./reset.css"

import eruda from "eruda"
import { useCallback, useEffect, useMemo, useState } from "react"

import { RefreshButton } from "./components/RefreshButton"
import { SettingsButton } from "./components/SettingsButton"
import { SettingsPanel } from "./components/SettingsPanel"
import { ThemeSwitcher } from "./components/ThemeSwitcher"
import LoginPrompt from "./components/LoginPrompt"
import {
  SubscriptionCardSkeleton,
  UsageDisplaySkeleton
} from "./components/Skeleton"
import { SubscriptionCard } from "./components/SubscriptionCard"
import { UsageDisplay } from "./components/UsageDisplay"
import { useAuth } from "./hooks/useAuth"
import { useDashboard } from "./hooks/useDashboard"
import { useSubscriptions } from "./hooks/useSubscriptions"
import { useSettings } from "./hooks/useSettings"
import packageJson from "./package.json"
import { useResetWindowTracker } from "./hooks/useResetWindowTracker"
import { browserAPI } from "./lib/browser-api"
import { extractResetTimes } from "./lib/utils/resetTime"
import { ViewType, ThemeType } from "./types"

// 在开发环境中启用 Eruda 调试工具
if (process.env.NODE_ENV === "development") {
  eruda.init()
}

function IndexPopup() {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.MAIN)
  const { tokenData, loading: authLoading, retry } = useAuth()
  const { settings, loading: settingsLoading, saveSettings, resetSettings } = useSettings()

  // 使用 Hook 获取数据
  const {
    dashboard,
    loading: dashboardLoading,
    error: dashboardError,
    refresh: refreshDashboard
  } = useDashboard(tokenData.isValid)

  const {
    subscriptions,
    loading: subscriptionsLoading,
    error: subscriptionsError,
    refresh: refreshSubscriptions
  } = useSubscriptions(tokenData.isValid)

  const loading = authLoading || dashboardLoading || subscriptionsLoading

  // 刷新所有数据 - 使用 useCallback 避免不必要的依赖更新
  const handleRefresh = useCallback(() => {
    if (tokenData.isValid) {
      refreshDashboard()
      refreshSubscriptions()
    }
  }, [tokenData.isValid, refreshDashboard, refreshSubscriptions])

  // 打开设置
  const handleOpenSettings = () => {
    setCurrentView(ViewType.SETTINGS)
  }

  // 关闭设置
  const handleCloseSettings = () => {
    setCurrentView(ViewType.MAIN)
  }

  // 切换主题
  const handleThemeChange = (theme: ThemeType) => {
    saveSettings({ theme })
  }

  // popup 打开时更新图标状态
  // 注意：不再主动调用 handleRefresh()，因为优化后的 hooks 会自动从缓存加载数据
  useEffect(() => {
    // 非阻塞地通知 background 更新图标状态
    // 使用 Promise 避免阻塞渲染
    Promise.resolve().then(() => {
      browserAPI.runtime.sendMessage({
        action: "updateIcon",
        isAuthenticated: tokenData.isValid,
        token: tokenData.authToken
      }).catch(() => {
        // 忽略错误（background 可能还未初始化）
      })
    })

    if (tokenData.isValid) {
      console.log("[Popup] Popup 已打开，hooks 将自动从缓存加载数据（秒开优化）")
    }
  }, [tokenData.isValid])

  // 统一的自动刷新定时器
  useEffect(() => {
    if (!tokenData.isValid) {
      return
    }

    // 优先使用用户设置，否则使用默认30秒
    const interval = settings.autoRefreshEnabled
      ? settings.autoRefreshInterval * 1000
      : 30 * 1000

    console.log(`[Popup] 启用自动刷新，间隔 ${interval / 1000} 秒`)

    const timer = setInterval(() => {
      console.log("[Popup] 自动刷新数据")
      // 直接调用刷新函数，避免依赖 handleRefresh 引用
      refreshDashboard()
      refreshSubscriptions()
    }, interval)

    return () => clearInterval(timer)
  }, [tokenData.isValid, settings.autoRefreshEnabled, settings.autoRefreshInterval, refreshDashboard, refreshSubscriptions])

  // 检查是否有符合规则的套餐（非 PAYGO、活跃中、额度未满、有剩余重置次数）
  const hasEligibleSubscriptions = (): boolean => {
    return subscriptions.some((sub) => {
      const basicCheck =
        !sub.subscriptionPlanName.includes("PAYGO") &&
        sub.isActive &&
        sub.subscriptionStatus === "活跃中"

      if (!basicCheck) return false

      // 额度未满
      const notFull = sub.currentCredits < sub.subscriptionPlan.creditLimit

      // 有剩余重置次数
      const hasResetTimes = sub.resetTimes > 0

      return notFull && hasResetTimes
    })
  }

  // 窗口开始时的统一刷新回调
  const onWindowStartRefresh = async (): Promise<void> => {
    console.log("[Popup] 执行窗口开始的统一刷新")
    await Promise.all([refreshDashboard(), refreshSubscriptions()])
  }

  // 重置窗口追踪器 - 只追踪符合条件的套餐
  const resetTimes = useMemo(() => {
    if (subscriptions.length === 0) return []

    // 筛选符合条件的套餐
    const eligibleSubs = subscriptions.filter((sub) => {
      const basicCheck =
        !sub.subscriptionPlanName.includes("PAYGO") &&
        sub.isActive &&
        sub.subscriptionStatus === "活跃中"

      if (!basicCheck) return false

      // 额度未满
      const notFull = sub.currentCredits < sub.subscriptionPlan.creditLimit

      // 有剩余重置次数
      const hasResetTimes = sub.resetTimes > 0

      return notFull && hasResetTimes
    })

    // 只提取符合条件的套餐的窗口内冷却时间
    return extractResetTimes(eligibleSubs, true)
  }, [subscriptions])

  const resetWindowStatus = useResetWindowTracker({
    enabled: settings.scheduledReset.enabled && tokenData.isValid,
    onWindowStartRefresh: onWindowStartRefresh,
    hasEligibleSubscriptions: hasEligibleSubscriptions,
    onResetTriggered: () => {
      console.log("[Popup] 重置窗口触发刷新")
      handleRefresh()
    },
    cooldownEndTimes: resetTimes
  })

  // 调试信息：显示重置窗口状态
  useEffect(() => {
    if (resetWindowStatus.inWindow && resetTimes.length > 0) {
      console.log(
        `[Popup] 当前在重置窗口内，正在追踪 ${resetWindowStatus.trackedCount} 个重置时间`
      )
    }
  }, [resetWindowStatus.inWindow, resetWindowStatus.trackedCount, resetTimes.length])

  // 主题切换
  useEffect(() => {
    const root = document.documentElement

    if (settings.theme === ThemeType.AUTO) {
      // 跟随 88code 网站主题
      const sync88CodeTheme = async () => {
        try {
          const result = await browserAPI.storage.local.get("88code_theme")
          const theme = result["88code_theme"]
          if (theme === "dark" || theme === "light") {
            root.classList.toggle("dark", theme === "dark")
          } else {
            // 如果没有读取到，默认使用浅色
            root.classList.toggle("dark", false)
          }
        } catch (error) {
          console.error("[Popup] 读取 88code 主题失败:", error)
          root.classList.toggle("dark", false)
        }
      }

      sync88CodeTheme()

      // 监听 storage 变化
      const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
        if (changes["88code_theme"]) {
          const newTheme = changes["88code_theme"].newValue
          if (newTheme === "dark" || newTheme === "light") {
            root.classList.toggle("dark", newTheme === "dark")
          }
        }
      }

      browserAPI.storage.onChanged.addListener(handleStorageChange)

      return () => {
        browserAPI.storage.onChanged.removeListener(handleStorageChange)
      }
    } else {
      // 手动设置
      root.classList.toggle("dark", settings.theme === ThemeType.DARK)
    }
  }, [settings.theme])

  return (
    <div className="min-w-[460px] w-[460px] h-[600px] bg-white dark:bg-gray-900">
      {currentView === ViewType.SETTINGS ? (
        <SettingsPanel
          settings={settings}
          onSave={saveSettings}
          onReset={resetSettings}
          onClose={handleCloseSettings}
        />
      ) : (
        <div className="flex flex-col h-full overflow-y-auto">
          {!authLoading && !tokenData.isValid ? (
            <LoginPrompt onRetry={retry} />
          ) : (
            <div className="flex flex-col space-y-4 p-6">
              {/* 头部 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-2xl font-bold tracking-tight">
                    <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      88Code
                    </span>
                    {" "}
                    <span className="text-orange-600 dark:text-orange-400">
                      Cost
                    </span>
                  </h1>
                  <div className="flex items-center space-x-2">
                    <ThemeSwitcher currentTheme={settings.theme} onThemeChange={handleThemeChange} />
                    <SettingsButton onClick={handleOpenSettings} />
                    {tokenData.isValid && (
                      <RefreshButton loading={loading} onRefresh={handleRefresh} />
                    )}
                  </div>
                </div>
              </div>

              {/* 使用情况 */}
              {tokenData.isValid && dashboard && (
                <UsageDisplay dashboard={dashboard} defaultExpanded={settings.showDetailedTokenStats} />
              )}
              {(authLoading || (tokenData.isValid && !dashboard && dashboardLoading)) && (
                <UsageDisplaySkeleton />
              )}

              {/* 错误提示 */}
              {tokenData.isValid && (dashboardError || subscriptionsError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {dashboardError || subscriptionsError}
                  </p>
                </div>
              )}

              {/* 套餐列表 */}
              {tokenData.isValid && subscriptions.length > 0 && (
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    套餐列表
                  </h2>
                  <div className="space-y-3">
                    {subscriptions.map((subscription) => (
                      <SubscriptionCard
                        key={subscription.id}
                        subscription={subscription}
                        onRefresh={handleRefresh}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 套餐加载骨架屏 */}
              {(authLoading ||
                (tokenData.isValid &&
                  subscriptions.length === 0 &&
                  subscriptionsLoading)) && (
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    套餐列表
                  </h2>
                  <div className="space-y-3">
                    <SubscriptionCardSkeleton />
                    <SubscriptionCardSkeleton />
                  </div>
                </div>
              )}

              {/* 版本信息 */}
              <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
                <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                  88Code Cost v{packageJson.version}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default IndexPopup
