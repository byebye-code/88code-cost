import "./reset.css"

import eruda from "eruda"
import { useEffect, useState, useRef } from "react"

import { RefreshButton } from "./components/RefreshButton"
import { SettingsButton } from "./components/SettingsButton"
import { SettingsPanel } from "./components/SettingsPanel"
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
import { ViewType, ThemeType } from "./types"

// 在开发环境中启用 Eruda 调试工具
if (process.env.NODE_ENV === "development") {
  eruda.init()
}

function IndexPopup() {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.MAIN)
  const { tokenData, loading: authLoading } = useAuth()
  const { settings, loading: settingsLoading, saveSettings, resetSettings } = useSettings()
  const autoRefreshTimerRef = useRef<NodeJS.Timeout | null>(null)

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

  // 刷新所有数据
  const handleRefresh = () => {
    if (tokenData.isValid) {
      refreshDashboard()
      refreshSubscriptions()
    }
  }

  // 打开设置
  const handleOpenSettings = () => {
    setCurrentView(ViewType.SETTINGS)
  }

  // 关闭设置
  const handleCloseSettings = () => {
    setCurrentView(ViewType.MAIN)
  }

  // popup 打开时立即获取数据
  useEffect(() => {
    if (tokenData.isValid) {
      console.log("[Popup] 开始加载数据")
      handleRefresh()
    }
  }, [tokenData.isValid])

  // popup 打开后 30 秒自动刷新
  useEffect(() => {
    if (!tokenData.isValid) {
      return
    }

    // 设置 30 秒定时刷新
    console.log("[Popup] 启用 30 秒自动刷新")
    const timer = setInterval(() => {
      console.log("[Popup] 30 秒自动刷新数据")
      handleRefresh()
    }, 30 * 1000)

    // 清理函数
    return () => {
      clearInterval(timer)
    }
  }, [tokenData.isValid])

  // 用户自定义间隔的自动刷新功能（如果启用）
  useEffect(() => {
    if (!tokenData.isValid || !settings.autoRefreshEnabled) {
      // 清除定时器
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current)
        autoRefreshTimerRef.current = null
      }
      return
    }

    // 设置定时器
    console.log(`[Popup] 启用用户自定义刷新，间隔 ${settings.autoRefreshInterval} 秒`)
    autoRefreshTimerRef.current = setInterval(() => {
      console.log("[Popup] 用户自定义间隔刷新数据")
      handleRefresh()
    }, settings.autoRefreshInterval * 1000)

    // 清理函数
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current)
        autoRefreshTimerRef.current = null
      }
    }
  }, [tokenData.isValid, settings.autoRefreshEnabled, settings.autoRefreshInterval])

  // 主题切换
  useEffect(() => {
    const root = document.documentElement

    if (settings.theme === ThemeType.AUTO) {
      // 跟随 88code 网站主题
      const sync88CodeTheme = async () => {
        try {
          const result = await chrome.storage.local.get("88code_theme")
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

      chrome.storage.onChanged.addListener(handleStorageChange)

      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange)
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
        <div className="flex flex-col space-y-6 p-6">
        {/* 头部 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              88Code 计费监控
            </h2>
            <div className="flex items-center space-x-1">
              <SettingsButton onClick={handleOpenSettings} />
              {tokenData.isValid && (
                <RefreshButton loading={loading} onRefresh={handleRefresh} />
              )}
            </div>
          </div>
        </div>

        {/* 认证状态 - 只在加载完成且确认无效时显示 */}
        {!authLoading && !tokenData.isValid && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg">
                  <path
                    clipRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    fillRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  未检测到认证
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>
                    请先访问{" "}
                    <a
                      className="font-medium underline"
                      href="https://www.88code.org"
                      rel="noreferrer"
                      target="_blank">
                      88code.org
                    </a>{" "}
                    并登录
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

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
          <div className="space-y-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">
              套餐列表
            </h3>
            {subscriptions.map((subscription) => (
              <SubscriptionCard
                key={subscription.id}
                subscription={subscription}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}

        {/* 套餐加载骨架屏 */}
        {(authLoading ||
          (tokenData.isValid &&
            subscriptions.length === 0 &&
            subscriptionsLoading)) && (
          <div className="space-y-3">
            <h3 className="text-base font-medium text-gray-900 dark:text-white">
              套餐列表
            </h3>
            <SubscriptionCardSkeleton />
            <SubscriptionCardSkeleton />
          </div>
        )}

        {/* 版本信息 */}
        <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
          <p className="text-center text-xs text-gray-500 dark:text-gray-400">
            88Code Cost Monitor v1.0.0
          </p>
        </div>
        </div>
        </div>
      )}
    </div>
  )
}

export default IndexPopup
