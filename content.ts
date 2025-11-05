/**
 * Content Script
 * 运行在 88code.org 页面上下文中，用于读取网站的 localStorage
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.88code.org/*"],
  run_at: "document_idle" // 改为 document_idle，确保 DOM 和 localStorage 已准备好
}

// 通知 background script 该页面的 content script 已准备好
chrome.runtime.sendMessage({ action: "contentScriptReady" }).catch(() => {
  // 忽略错误（可能是 background script 还没准备好）
})

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  if (request.action === "getLocalStorage") {
    try {
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
          break
        }
      }

      // 返回数据
      sendResponse({
        allLocalStorage,
        authToken: foundToken,
        tokenKey: foundKey
      })
    } catch (error) {
      console.error("[Content Script] 读取 localStorage 失败:", error)
      sendResponse({ error: String(error) })
    }

    return true // 保持消息通道开启
  }

  // 读取 sessionStorage
  if (request.action === "getSessionStorage") {
    try {
      const allSessionStorage: Record<string, string> = {}
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i)
        if (key) {
          allSessionStorage[key] = sessionStorage.getItem(key) || ""
        }
      }

      sendResponse({ allSessionStorage })
    } catch (error) {
      console.error("[Content Script] 读取 sessionStorage 失败:", error)
      sendResponse({ error: String(error) })
    }

    return true
  }

  // 读取 cookies
  if (request.action === "getCookies") {
    try {
      sendResponse({ cookies: document.cookie })
    } catch (error) {
      console.error("[Content Script] 读取 cookies 失败:", error)
      sendResponse({ error: String(error) })
    }

    return true
  }
})

// 页面加载完成后，主动检查并报告 localStorage
window.addEventListener("load", () => {
  try {
    const allLocalStorage: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        allLocalStorage[key] = localStorage.getItem(key) || ""
      }
    }
  } catch (error) {
    console.error("[Content Script] 检查 localStorage 失败:", error)
  }
})
