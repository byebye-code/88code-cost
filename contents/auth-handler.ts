/**
 * Auth Handler Content Script
 * 运行在 88code.org 页面上下文中，用于读取网站的 localStorage
 * 支持 Chrome、Edge、Firefox
 *
 * Edge 兼容性改进：
 * 1. 移动到 contents/ 目录（Plasmo 推荐）
 * 2. 使用原生 Chrome API 而不是 polyfill（避免 Edge 的 polyfill 问题）
 * 3. 在脚本顶层立即注册监听器
 * 4. 使用同步返回 true 支持异步 sendResponse
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.88code.org/*"],
  run_at: "document_end",
  all_frames: false
}

// 立即打印加载信息
console.log("[Auth Handler] Content script 已加载", {
  url: window.location.href,
  readyState: document.readyState,
  timestamp: new Date().toISOString(),
  hasChrome: typeof chrome !== "undefined",
  hasBrowser: typeof browser !== "undefined"
})

/**
 * 消息处理函数
 * 必须同步返回 true 以支持异步 sendResponse（Edge/Chrome 要求）
 */
function handleMessage(
  request: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  console.log("[Auth Handler] 收到消息:", request, {
    timestamp: new Date().toISOString(),
    action: request.action
  })

  try {
    // Ping 测试 - 验证 content script 是否活跃
    if (request.action === "ping") {
      console.log("[Auth Handler] 响应 ping")
      sendResponse({
        success: true,
        message: "Content script is alive",
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
      return false // Ping 是同步响应
    }

    // 读取 localStorage
    if (request.action === "getLocalStorage") {
      console.log("[Auth Handler] 开始读取 localStorage...")

      // 读取所有 localStorage 数据
      const allLocalStorage: Record<string, string> = {}
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key) {
          allLocalStorage[key] = localStorage.getItem(key) || ""
        }
      }

      // 查找可能的 token 字段
      const possibleTokenKeys = [
        "authToken",
        "token",
        "accessToken",
        "access_token",
        "auth_token",
        "jwt",
        "jwtToken",
        "authorization",
        "bearer"
      ]

      let foundToken: string | null = null
      let foundKey: string | null = null

      console.log("[Auth Handler] localStorage 键列表:", Object.keys(allLocalStorage))
      console.log("[Auth Handler] localStorage 完整内容:", allLocalStorage)

      // 查找可能包含 token 的键
      for (const key of Object.keys(allLocalStorage)) {
        const lowerKey = key.toLowerCase()
        if (
          possibleTokenKeys.some((tokenKey) =>
            lowerKey.includes(tokenKey.toLowerCase())
          )
        ) {
          foundToken = allLocalStorage[key]
          foundKey = key
          console.log(`[Auth Handler] ✅ 找到 token，键: ${foundKey}`)
          console.log(`[Auth Handler] Token 前20个字符: ${foundToken?.substring(0, 20)}...`)
          break
        }
      }

      if (!foundToken) {
        console.warn("[Auth Handler] ⚠️ 未找到 token，请检查是否已登录")
        console.warn("[Auth Handler] 可能的原因:")
        console.warn("  1. 用户未登录 88code.org")
        console.warn("  2. Token 存储在其他位置（sessionStorage、cookie）")
        console.warn("  3. Token 的键名已更改")
      }

      // 返回数据
      const response = {
        allLocalStorage,
        authToken: foundToken,
        tokenKey: foundKey
      }

      console.log("[Auth Handler] 返回响应:", {
        hasToken: !!foundToken,
        tokenKey: foundKey,
        localStorageKeys: Object.keys(allLocalStorage).length
      })

      sendResponse(response)
      return false // 同步响应
    }

    // 读取 sessionStorage
    if (request.action === "getSessionStorage") {
      const allSessionStorage: Record<string, string> = {}
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) {
          allSessionStorage[key] = sessionStorage.getItem(key) || ""
        }
      }
      sendResponse({ allSessionStorage })
      return false
    }

    // 读取 cookies
    if (request.action === "getCookies") {
      sendResponse({ cookies: document.cookie })
      return false
    }

    // 未知 action
    console.warn("[Auth Handler] 未知的 action:", request.action)
    sendResponse({ error: "Unknown action" })
    return false

  } catch (error) {
    console.error("[Auth Handler] 处理消息失败:", error)
    sendResponse({ error: String(error) })
    return false
  }
}

// 立即注册监听器（脚本顶层，同步执行）
// 使用原生 Chrome API，避免 Edge 的 polyfill 问题
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener(handleMessage)
  console.log("[Auth Handler] ✅ 消息监听器已注册（Chrome API）")
} else if (typeof browser !== "undefined" && browser.runtime && browser.runtime.onMessage) {
  // Firefox fallback - 使用 as any 避免类型不兼容
  browser.runtime.onMessage.addListener(handleMessage as any)
  console.log("[Auth Handler] ✅ 消息监听器已注册（Browser API）")
} else {
  console.error("[Auth Handler] ❌ 无法注册消息监听器：运行环境不支持")
}
