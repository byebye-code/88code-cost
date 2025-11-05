/**
 * Settings Hook - 管理应用设置
 */

import { useState, useEffect } from "react"
import { Storage } from "@plasmohq/storage"
import type { AppSettings } from "~/types"
import { DEFAULT_SETTINGS } from "~/types"

const storage = new Storage()
const SETTINGS_KEY = "app_settings"

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)

  // 从存储加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await storage.get(SETTINGS_KEY)
        if (stored) {
          const parsedSettings = JSON.parse(stored) as AppSettings
          // 合并默认设置以确保新增字段有默认值
          setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
        }
      } catch (error) {
        console.error("[useSettings] 加载设置失败:", error)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [])

  // 保存设置
  const saveSettings = async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings }
      await storage.set(SETTINGS_KEY, JSON.stringify(updatedSettings))
      setSettings(updatedSettings)
      console.log("[useSettings] 设置已保存:", updatedSettings)
      return true
    } catch (error) {
      console.error("[useSettings] 保存设置失败:", error)
      return false
    }
  }

  // 重置设置
  const resetSettings = async () => {
    try {
      await storage.set(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS))
      setSettings(DEFAULT_SETTINGS)
      console.log("[useSettings] 设置已重置")
      return true
    } catch (error) {
      console.error("[useSettings] 重置设置失败:", error)
      return false
    }
  }

  return {
    settings,
    loading,
    saveSettings,
    resetSettings
  }
}
