/**
 * 主题切换组件
 * 单个图标按钮，点击循环切换：浅色 -> 深色 -> 自动（跟随88code） -> 浅色 ...
 */

import React from "react"
import { ThemeType } from "~/types"

interface ThemeSwitcherProps {
  currentTheme: ThemeType
  onThemeChange: (theme: ThemeType) => void
}

export function ThemeSwitcher({ currentTheme, onThemeChange }: ThemeSwitcherProps) {
  // 主题配置
  const themeConfig: Record<ThemeType, {
    label: string
    icon: string
    next: ThemeType
  }> = {
    [ThemeType.LIGHT]: {
      label: "浅色模式",
      icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z",
      next: ThemeType.DARK
    },
    [ThemeType.DARK]: {
      label: "深色模式",
      icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z",
      next: ThemeType.AUTO
    },
    [ThemeType.AUTO]: {
      label: "跟随88code",
      // 左右分割：左侧太阳光芒，右侧月亮弧线
      icon: "M12 2v2m0 16v2M6.34 6.34l1.42 1.42M6.34 17.66l1.42-1.42M2 12h2m16 0h2m-4.34-5.66l-1.42 1.42m1.42 11.9l-1.42-1.42M12 7a5 5 0 0 1 0 10z",
      next: ThemeType.LIGHT
    }
  }

  const current = themeConfig[currentTheme]

  // 点击切换到下一个主题
  const handleClick = () => {
    onThemeChange(current.next)
  }

  return (
    <button
      onClick={handleClick}
      title={`当前：${current.label}（点击切换）`}
      className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300">
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={current.icon} />
      </svg>
    </button>
  )
}
