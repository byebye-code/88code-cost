/**
 * useDashboard Hook
 * 管理 Dashboard 统计数据，支持缓存
 */

import { useEffect, useState } from "react"

import { fetchDashboard } from "~/lib/api/client"
import { getCacheData, setCacheData } from "~/lib/storage"
import type { DashboardData } from "~/types"

const CACHE_KEY = "dashboard_cache"
const CACHE_MAX_AGE = 5 * 60 * 1000 // 5分钟缓存

export function useDashboard(shouldFetch: boolean) {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDashboard = async (useCache = true) => {
    if (!shouldFetch) return

    // 先尝试从缓存加载
    if (useCache) {
      const cachedData = await getCacheData<DashboardData>(
        CACHE_KEY,
        CACHE_MAX_AGE
      )
      if (cachedData) {
        console.log("[Dashboard] 使用缓存数据")
        setDashboard(cachedData)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetchDashboard()

      if (response.success && response.data) {
        setDashboard(response.data)
        // 保存到缓存
        await setCacheData(CACHE_KEY, response.data)
      } else {
        setError(response.message || "获取统计信息失败")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "未知错误")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [shouldFetch])

  return {
    dashboard,
    loading,
    error,
    refresh: () => loadDashboard(false) // 刷新时不使用缓存
  }
}
