/**
 * useSubscriptions Hook
 * 管理订阅数据，优化为秒开
 *
 * 优化策略：
 * 1. 始终从缓存读取（background service worker 负责预取数据）
 * 2. 监听 storage 变化，自动更新 UI
 * 3. 手动刷新时通知 background worker 重新获取
 */

import { useEffect, useState, useCallback } from "react"

import { fetchSubscriptions } from "~/lib/api/client"
import { getCacheData, setCacheData, storage } from "~/lib/storage"
import type { Subscription } from "~/types"
import { browserAPI } from "~/lib/browser-api"

const CACHE_KEY = "subscriptions_cache"

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
  console.log(`[${getTimestamp()}] [Subscriptions] ${message}`, ...args)
}

function warn(message: string, ...args: any[]): void {
  console.warn(`[${getTimestamp()}] [Subscriptions] ${message}`, ...args)
}

function error(message: string, ...args: any[]): void {
  console.error(`[${getTimestamp()}] [Subscriptions] ${message}`, ...args)
}

export function useSubscriptions(shouldFetch: boolean) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 从缓存加载数据，如果缓存为空则主动发起 API 请求
  const loadFromCache = async () => {
    if (!shouldFetch) return

    const startTime = Date.now()
    try {
      const cachedData = await getCacheData<Subscription[]>(CACHE_KEY)
      const cacheDuration = Date.now() - startTime

      if (cachedData) {
        log(`从缓存加载数据（秒开），耗时 ${cacheDuration}ms`)
        setSubscriptions(cachedData)
      } else {
        log(`缓存为空，主动发起 API 请求，耗时 ${cacheDuration}ms`)

        // 缓存为空，主动发起 API 请求
        setLoading(true)
        const apiStartTime = Date.now()
        const apiResponse = await fetchSubscriptions()
        const apiDuration = Date.now() - apiStartTime

        if (apiResponse.success && apiResponse.data) {
          log(`API 请求成功，耗时 ${apiDuration}ms`)
          setSubscriptions(apiResponse.data)
          await setCacheData(CACHE_KEY, apiResponse.data)
        } else {
          warn(`API 请求失败: ${apiResponse.message}`)
          setError(apiResponse.message || "获取订阅信息失败")
        }
        setLoading(false)
      }
    } catch (err) {
      error("加载数据失败:", err)
      setError(err instanceof Error ? err.message : "未知错误")
      setLoading(false)
    }
  }

  // 手动刷新：通知 background worker 重新获取数据
  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const refreshStartTime = Date.now()

    try {
      log("开始手动刷新...")

      // 方式1: 通知 background worker 刷新（推荐）
      const response = await browserAPI.runtime.sendMessage({
        action: "refreshData"
      })

      if (response?.success) {
        const duration = Date.now() - refreshStartTime
        log(`已通知 background worker 刷新数据，耗时 ${duration}ms`)
        // Background worker 会更新 storage，触发 storage.watch 自动更新 UI
      } else {
        // 方式2: 降级到直接 API 调用（background worker 不可用时）
        warn("Background worker 不可用，降级到直接 API 调用")
        const apiStartTime = Date.now()
        const apiResponse = await fetchSubscriptions()
        const apiDuration = Date.now() - apiStartTime

        if (apiResponse.success && apiResponse.data) {
          log(`直接 API 调用成功，耗时 ${apiDuration}ms`)
          setSubscriptions(apiResponse.data)
          await setCacheData(CACHE_KEY, apiResponse.data)
        } else {
          warn(`API 调用失败: ${apiResponse.message}`)
          setError(apiResponse.message || "获取订阅信息失败")
        }
      }
    } catch (err) {
      const duration = Date.now() - refreshStartTime
      error(`刷新失败，耗时 ${duration}ms:`, err)
      setError(err instanceof Error ? err.message : "未知错误")
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始化：从缓存加载
  useEffect(() => {
    loadFromCache()
  }, [shouldFetch])

  // 监听 storage 变化，自动更新 UI
  useEffect(() => {
    if (!shouldFetch) return

    const unwatch = storage.watch({
      [CACHE_KEY]: (change) => {
        log("检测到缓存更新，自动刷新 UI")
        loadFromCache()
      }
    })

    return () => {
      unwatch()
    }
  }, [shouldFetch])

  return {
    subscriptions,
    loading,
    error,
    refresh
  }
}
