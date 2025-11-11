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

const isDev = process.env.NODE_ENV === "development"

const logDebug = (...args: any[]) => {
  if (isDev) {
    console.log("[Auth Handler]", ...args)
  }
}

logDebug("content script 已加载")

/**
 * 消息处理函数
 * 必须同步返回 true 以支持异步 sendResponse（Edge/Chrome 要求）
 */
function handleMessage(
  request: any,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  logDebug("收到消息", request?.action)

  try {
    // Ping 测试 - 验证 content script 是否活跃
    if (request.action === "ping") {
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

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue

        const value = localStorage.getItem(key) || ""
        const lowerKey = key.toLowerCase()

        if (
          possibleTokenKeys.some((tokenKey) =>
            lowerKey.includes(tokenKey.toLowerCase())
          )
        ) {
          foundToken = value
          break
        }
      }

      if (!foundToken) {
        logDebug("未在 localStorage 中找到 token")
      }

      // 返回数据
      sendResponse({ authToken: foundToken })
      return false // 同步响应
    }

    // 未知 action
    logDebug("未知 action", request.action)
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
  console.log("[Auth Handler] [OK] 消息监听器已注册（Chrome API）")
} else if (typeof browser !== "undefined" && browser.runtime && browser.runtime.onMessage) {
  // Firefox fallback - 使用 as any 避免类型不兼容
  browser.runtime.onMessage.addListener(handleMessage as any)
  console.log("[Auth Handler] [OK] 消息监听器已注册（Browser API）")
} else {
  console.error("[Auth Handler] [ERROR] 无法注册消息监听器：运行环境不支持")
}
