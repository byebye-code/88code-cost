/**
 * useAuth Hook
 * 管理认证状态，通过调用登录信息接口验证
 *
 * 优化策略：
 * 1. 优先使用缓存的验证状态（5分钟有效期）
 * 2. 先快速返回缓存状态，后台异步验证
 * 3. 减少 popup 打开时的阻塞时间
 */

import { useEffect, useState, useCallback } from "react"

import { fetchLoginInfo, getSessionToken, clearSessionTokenCache } from "~/lib/api/client"
import { getCacheData, setCacheData, clearAuthToken } from "~/lib/storage"
import type { TokenData } from "~/types"

const AUTH_CACHE_KEY = "auth_validation_cache"
const AUTH_CACHE_MAX_AGE = 5 * 60 * 1000 // 5分钟缓存

interface AuthCache {
  token: string
  isValid: boolean
  timestamp: number
}

export function useAuth() {
  const [tokenData, setTokenData] = useState<TokenData>({
    authToken: null,
    isValid: false
  })
  const [loading, setLoading] = useState(true)

  const checkAuth = useCallback(async () => {
      // 第一步：快速读取 token（使用会话缓存避免重复调用）
      const token = await getSessionToken()

      if (!token) {
        console.log("[Auth] 未找到 token")
        console.log("[Auth] [TIP] 如果您已登录 88code.org，请刷新该页面后重试")
        setTokenData({
          authToken: null,
          isValid: false
        })
        setLoading(false)
        return
      }

      // 第二步：检查缓存的验证状态
      const cachedAuth = await getCacheData<AuthCache>(AUTH_CACHE_KEY, AUTH_CACHE_MAX_AGE)

      if (cachedAuth && cachedAuth.token === token && cachedAuth.isValid) {
        console.log("[Auth] 使用缓存的验证状态（有效期内）")
        setTokenData({
          authToken: token,
          isValid: true
        })
        setLoading(false)

        // 后台静默验证，确保 token 仍然有效
        console.log("[Auth] 后台静默验证 token...")
        fetchLoginInfo().then(result => {
          if (!result.success || !result.data) {
            console.log("[Auth] 后台验证失败，token 已失效")
            setTokenData({
              authToken: null,
              isValid: false
            })
          } else {
            // 更新缓存时间戳
            setCacheData(AUTH_CACHE_KEY, {
              token,
              isValid: true,
              timestamp: Date.now()
            })
          }
        }).catch(err => {
          console.warn("[Auth] 后台验证异常:", err)
        })

        return
      }

      // 第三步：缓存不存在或已过期，进行同步验证
      console.log("[Auth] 缓存不存在或已过期，验证登录状态...")
      const result = await fetchLoginInfo()

      if (result.success && result.data) {
        console.log("[Auth] 登录验证成功")
        setTokenData({
          authToken: token,
          isValid: true
        })

        // 保存验证结果到缓存
        await setCacheData(AUTH_CACHE_KEY, {
          token,
          isValid: true,
          timestamp: Date.now()
        })
      } else {
        console.log("[Auth] 登录验证失败:", result.message)

        // Token 失效，清除所有缓存
        console.log("[Auth] 清除失效的 token 缓存")
        await clearAuthToken()
        clearSessionTokenCache()

        setTokenData({
          authToken: null,
          isValid: false
        })
      }

      setLoading(false)
    }, [])

  // 重试方法：清除缓存并重新检查认证状态
  const retry = useCallback(async () => {
    console.log("[Auth] 手动重试认证...")
    setLoading(true)

    // 清除会话缓存，强制重新获取 token
    clearSessionTokenCache()

    await checkAuth()
  }, [checkAuth])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return { tokenData, loading, retry }
}
