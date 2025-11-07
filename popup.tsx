import "./reset.css"

import eruda from "eruda"
import { useEffect, useState } from "react"

import { RefreshButton } from "./components/RefreshButton"
import { SettingsButton } from "./components/SettingsButton"
import { SettingsPanel } from "./components/SettingsPanel"
import { ThemeSwitcher } from "./components/ThemeSwitcher"
import { EmptyState } from "./components/EmptyState"
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
import { browserAPI } from "./lib/browser-api"
import { ViewType, ThemeType } from "./types"

// 在开发环境中启用 Eruda 调试工具
if (process.env.NODE_ENV === "development") {
  eruda.init()
}

function IndexPopup() {
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.MAIN)
  const { tokenData, loading: authLoading } = useAuth()
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

  // 切换主题
  const handleThemeChange = (theme: ThemeType) => {
    saveSettings({ theme })
  }

  // popup 打开时立即获取数据并更新图标
  useEffect(() => {
    // 通知 background 更新图标状态，携带当前登录状态和 token
    browserAPI.runtime.sendMessage({
      action: "updateIcon",
      isAuthenticated: tokenData.isValid,
      token: tokenData.authToken
    }).catch(() => {
      // 忽略错误（background 可能还未初始化）
    })

    if (tokenData.isValid) {
      console.log("[Popup] 开始加载数据")
      handleRefresh()
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
      handleRefresh()
    }, interval)

    return () => clearInterval(timer)
  }, [tokenData.isValid, settings.autoRefreshEnabled, settings.autoRefreshInterval, handleRefresh])

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
            <EmptyState />
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
                  88Code Cost v1.0.0
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
