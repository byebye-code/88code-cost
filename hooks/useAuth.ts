/**
 * useAuth Hook
 * 管理认证状态，通过调用登录信息接口验证
 */

import { useEffect, useState } from "react"

import { fetchLoginInfo } from "~/lib/api/client"
import { getAuthToken } from "~/lib/storage"
import type { TokenData } from "~/types"

export function useAuth() {
  const [tokenData, setTokenData] = useState<TokenData>({
    authToken: null,
    isValid: false
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true)
      const token = await getAuthToken()

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

      // 调用登录信息接口验证 token 是否有效
      console.log("[Auth] 验证登录状态...")
      const result = await fetchLoginInfo()

      if (result.success && result.data) {
        console.log("[Auth] 登录验证成功")
        setTokenData({
          authToken: token,
          isValid: true
        })
      } else {
        console.log("[Auth] 登录验证失败:", result.message)
        setTokenData({
          authToken: null,
          isValid: false
        })
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  return { tokenData, loading }
}
