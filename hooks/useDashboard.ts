/**
 * useDashboard Hook
 * 管理 Dashboard 统计数据，优化为秒开
 *
 * 优化策略：
 * 1. 始终从缓存读取（background service worker 负责预取数据）
 * 2. 监听 storage 变化，自动更新 UI
 * 3. 手动刷新时通知 background worker 重新获取
 */

import { useEffect, useState, useCallback } from "react"

import { fetchDashboard } from "~/lib/api/client"
import { getCacheData, setCacheData } from "~/lib/storage"
import type { DashboardData } from "~/types"

const CACHE_KEY = "dashboard_cache"

/**
 * 获取格式化的时间戳字符串
 */
function getTimestamp(): string {
  const now = new Date()
  return now.toISOString().replace('T', ' ').substring(0, 23)
}

/**
 * 带时间戳的日志函数
 */
function log(message: string, ...args: any[]): void {
  console.log(`[${getTimestamp()}] [Dashboard] ${message}`, ...args)
}

function warn(message: string, ...args: any[]): void {
  console.warn(`[${getTimestamp()}] [Dashboard] ${message}`, ...args)
}

function error(message: string, ...args: any[]): void {
  console.error(`[${getTimestamp()}] [Dashboard] ${message}`, ...args)
}

export function useDashboard(shouldFetch: boolean) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 从缓存加载数据，如果缓存为空则主动发起 API 请求
  const loadFromCache = async () => {
    if (!shouldFetch) return

    const startTime = Date.now()
    try {
      const cachedData = await getCacheData<DashboardData>(CACHE_KEY)
      const cacheDuration = Date.now() - startTime

      if (cachedData) {
        log(`从缓存加载数据（秒开），耗时 ${cacheDuration}ms`)
        setDashboard(cachedData)
      } else {
        log(`缓存为空，主动发起 API 请求，耗时 ${cacheDuration}ms`)

        // 缓存为空，主动发起 API 请求
        setLoading(true)
        const apiStartTime = Date.now()
        const apiResponse = await fetchDashboard()
        const apiDuration = Date.now() - apiStartTime

        if (apiResponse.success && apiResponse.data) {
          log(`API 请求成功，耗时 ${apiDuration}ms`)
          setDashboard(apiResponse.data)
          await setCacheData(CACHE_KEY, apiResponse.data)
        } else {
          warn(`API 请求失败: ${apiResponse.message}`)
          setError(apiResponse.message || "获取统计信息失败")
        }
        setLoading(false)
      }
    } catch (err) {
      error("加载数据失败:", err)
      setError(err instanceof Error ? err.message : "未知错误")
      setLoading(false)
    }
  }

  // 手动刷新：直接调用 API 获取最新数据
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const refreshStartTime = Date.now()

    try {
      log("开始手动刷新...")

      // 直接调用 API（避免依赖 background worker，解决 Service Worker 挂起问题）
      const apiResponse = await fetchDashboard()
      const duration = Date.now() - refreshStartTime

      if (apiResponse.success && apiResponse.data) {
        log(`✅ 刷新成功，耗时 ${duration}ms`)
        setDashboard(apiResponse.data)
        await setCacheData(CACHE_KEY, apiResponse.data)
      } else {
        warn(`⚠️ 刷新失败: ${apiResponse.message}`)
        setError(apiResponse.message || "获取统计信息失败")
      }
    } catch (err) {
      const duration = Date.now() - refreshStartTime
      error(`❌ 刷新异常，耗时 ${duration}ms:`, err)
      setError(err instanceof Error ? err.message : "未知错误")
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始化：从缓存加载
  useEffect(() => {
    loadFromCache()
  }, [shouldFetch])

  // 不再监听 storage 变化（已移除 background worker 的定期数据获取）
  // 数据刷新完全由 popup 的手动刷新和自动刷新定时器控制

  return {
    dashboard,
    loading,
    error,
    refresh
  }
}
