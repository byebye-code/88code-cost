/**
 * 跨浏览器 API 适配层
 * 统一处理 Chrome、Edge、Firefox 的 API 差异
 */

// Firefox 使用 browser.* API，Chrome/Edge 使用 chrome.* API
// webextension-polyfill 提供统一的 Promise-based API
import Browser from "webextension-polyfill"

/**
 * 统一的浏览器 API
 * 优先使用 webextension-polyfill，fallback 到原生 chrome API
 */
export const browserAPI = {
  // Storage API
  storage: {
    local: {
      get: (keys?: string | string[] | { [key: string]: any } | null) => {
        if (typeof Browser !== "undefined" && Browser.storage) {
          return Browser.storage.local.get(keys)
        }
        return new Promise((resolve) => {
          chrome.storage.local.get(keys, resolve)
        })
      },
      set: (items: { [key: string]: any }) => {
        if (typeof Browser !== "undefined" && Browser.storage) {
          return Browser.storage.local.set(items)
        }
        return new Promise((resolve) => {
          chrome.storage.local.set(items, resolve)
        })
      },
      remove: (keys: string | string[]) => {
        if (typeof Browser !== "undefined" && Browser.storage) {
          return Browser.storage.local.remove(keys)
        }
        return new Promise((resolve) => {
          chrome.storage.local.remove(keys, resolve)
        })
      }
    },
    onChanged: {
      addListener: (
        callback: (
          changes: { [key: string]: chrome.storage.StorageChange },
          areaName: string
        ) => void
      ) => {
        if (typeof Browser !== "undefined" && Browser.storage) {
          Browser.storage.onChanged.addListener(callback)
        } else {
          chrome.storage.onChanged.addListener(callback)
        }
      },
      removeListener: (
        callback: (
          changes: { [key: string]: chrome.storage.StorageChange },
          areaName: string
        ) => void
      ) => {
        if (typeof Browser !== "undefined" && Browser.storage) {
          Browser.storage.onChanged.removeListener(callback)
        } else {
          chrome.storage.onChanged.removeListener(callback)
        }
      }
    }
  },

  // Tabs API
  tabs: {
    query: (queryInfo: chrome.tabs.QueryInfo) => {
      if (typeof Browser !== "undefined" && Browser.tabs) {
        return Browser.tabs.query(queryInfo)
      }
      return new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query(queryInfo, resolve)
      })
    },
    sendMessage: (tabId: number, message: any) => {
      if (typeof Browser !== "undefined" && Browser.tabs) {
        return Browser.tabs.sendMessage(tabId, message)
      }
      return new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message))
          } else {
            resolve(response)
          }
        })
      })
    }
  },

  // Runtime API
  runtime: {
    get id() {
      if (typeof Browser !== "undefined" && Browser.runtime) {
        return Browser.runtime.id
      }
      return chrome.runtime.id
    },
    sendMessage: (message: any) => {
      if (typeof Browser !== "undefined" && Browser.runtime) {
        return Browser.runtime.sendMessage(message)
      }
      return new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve)
      })
    },
    onMessage: {
      addListener: (
        callback: (
          message: any,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: any) => void
        ) => boolean | void
      ) => {
        if (typeof Browser !== "undefined" && Browser.runtime) {
          Browser.runtime.onMessage.addListener(callback)
        } else {
          chrome.runtime.onMessage.addListener(callback)
        }
      },
      removeListener: (
        callback: (
          message: any,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response?: any) => void
        ) => boolean | void
      ) => {
        if (typeof Browser !== "undefined" && Browser.runtime) {
          Browser.runtime.onMessage.removeListener(callback)
        } else {
          chrome.runtime.onMessage.removeListener(callback)
        }
      }
    },
    onInstalled: {
      addListener: (
        callback: (details: chrome.runtime.InstalledDetails) => void
      ) => {
        if (typeof Browser !== "undefined" && Browser.runtime) {
          Browser.runtime.onInstalled.addListener(callback)
        } else {
          chrome.runtime.onInstalled.addListener(callback)
        }
      }
    }
  },

  // Cookies API
  cookies: {
    getAll: (details: chrome.cookies.GetAllDetails) => {
      if (typeof Browser !== "undefined" && Browser.cookies) {
        return Browser.cookies.getAll(details)
      }
      return new Promise<chrome.cookies.Cookie[]>((resolve) => {
        chrome.cookies.getAll(details, resolve)
      })
    }
  }
}

/**
 * 检测当前浏览器类型
 */
export function getBrowserType(): "chrome" | "firefox" | "edge" | "unknown" {
  const userAgent = navigator.userAgent.toLowerCase()

  if (userAgent.includes("edg/")) {
    return "edge"
  }
  if (userAgent.includes("firefox")) {
    return "firefox"
  }
  if (userAgent.includes("chrome")) {
    return "chrome"
  }

  return "unknown"
}

/**
 * 检查是否支持 MV3
 */
export function supportsMV3(): boolean {
  return typeof chrome !== "undefined" && chrome.runtime?.getManifest?.()?.manifest_version === 3
}
