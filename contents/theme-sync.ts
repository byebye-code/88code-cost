/**
 * Theme Sync Content Script
 * 从 88code.org 网站同步 theme 设置到扩展
 */

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://www.88code.org/*", "https://88code.org/*"],
  run_at: "document_start"
}

const THEME_STORAGE_KEY = "88code_theme"

/**
 * 从 88code 网站读取 theme 值
 */
function get88CodeTheme(): string | null {
  try {
    // 尝试从 localStorage 读取 theme
    const theme = localStorage.getItem("theme")
    if (theme === "dark" || theme === "light") {
      return theme
    }

    // 如果没有找到，检查 HTML 的 class
    if (document.documentElement.classList.contains("dark")) {
      return "dark"
    }

    return "light"
  } catch (error) {
    console.error("[ThemeSync] 读取主题失败:", error)
    return null
  }
}

/**
 * 同步主题到扩展 storage
 */
async function syncThemeToExtension(theme: string) {
  try {
    await chrome.storage.local.set({ [THEME_STORAGE_KEY]: theme })
    console.log(`[ThemeSync] 主题已同步: ${theme}`)
  } catch (error) {
    console.error("[ThemeSync] 同步主题失败:", error)
  }
}

/**
 * 初始化主题同步
 */
async function initThemeSync() {
  // 立即读取并同步当前主题
  const theme = get88CodeTheme()
  if (theme) {
    await syncThemeToExtension(theme)
  }

  // 监听 localStorage 变化
  window.addEventListener("storage", (event) => {
    if (event.key === "theme" && event.newValue) {
      const newTheme = event.newValue
      if (newTheme === "dark" || newTheme === "light") {
        syncThemeToExtension(newTheme)
      }
    }
  })

  // 使用 MutationObserver 监听 HTML class 变化
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        const theme = get88CodeTheme()
        if (theme) {
          syncThemeToExtension(theme)
        }
      }
    }
  })

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"]
  })

  console.log("[ThemeSync] 主题同步已启动")
}

// 启动同步
initThemeSync()
