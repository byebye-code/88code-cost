/**
 * 设置面板组件
 */

import React, { useState } from "react"
import type { AppSettings, ThemeType, ScheduledResetWindow } from "~/types"

interface SettingsPanelProps {
  settings: AppSettings
  onSave: (settings: Partial<AppSettings>) => Promise<boolean>
  onReset: () => Promise<boolean>
  onClose: () => void
}

export function SettingsPanel({ settings, onSave, onReset, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<"theme" | "scheduled">("scheduled")

  // 更新设置并立即保存
  const updateSetting = async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    await onSave({ [key]: value })
  }

  // 更新定时重置设置并立即保存
  const updateScheduledReset = async <K extends keyof AppSettings["scheduledReset"]>(
    key: K,
    value: AppSettings["scheduledReset"][K]
  ) => {
    await onSave({
      scheduledReset: { ...settings.scheduledReset, [key]: value }
    })
  }

  // 获取时间窗口描述
  const getWindowDescription = (window: ScheduledResetWindow) => {
    const time = `${String(window.hour).padStart(2, '0')}:${String(window.minute).padStart(2, '0')}`
    if (window.randomMinutes > 0) {
      return `在 ${time} 前的 ${window.randomMinutes} 分钟内随机执行`
    }
    return `在 ${time} 准时执行`
  }

  // 更新时间窗口并立即保存
  const updateWindow = async (index: number, window: ScheduledResetWindow) => {
    await onSave({
      scheduledReset: {
        ...settings.scheduledReset,
        windows: settings.scheduledReset.windows.map((w, i) => (i === index ? window : w))
      }
    })
  }

  // 添加时间窗口并立即保存
  const addWindow = async () => {
    await onSave({
      scheduledReset: {
        ...settings.scheduledReset,
        windows: [
          ...settings.scheduledReset.windows,
          { enabled: true, hour: 12, minute: 0, randomMinutes: 5 }
        ]
      }
    })
  }

  // 删除时间窗口并立即保存
  const removeWindow = async (index: number) => {
    await onSave({
      scheduledReset: {
        ...settings.scheduledReset,
        windows: settings.scheduledReset.windows.filter((_, i) => i !== index)
      }
    })
  }

  return (
    <div className="flex flex-col h-full min-h-[600px] bg-white dark:bg-gray-800">
      {/* 头部 */}
      <div className="flex items-center space-x-3 border-b border-gray-200 p-4 dark:border-gray-700">
        <button
          onClick={onClose}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
          aria-label="返回">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">设置</h2>
      </div>

        {/* 标签页导航 */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: "scheduled", label: "定时重置", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
            { id: "theme", label: "主题", icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}>
              <div className="flex items-center justify-center space-x-1">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                </svg>
                <span>{tab.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <div className="max-h-[420px] overflow-y-auto p-4">
          {/* 主题设置 */}
          {activeTab === "theme" && (
            <div className="space-y-4">
              {[
                { value: "light", label: "浅色模式", icon: "M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" },
                { value: "dark", label: "深色模式", icon: "M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" },
                { value: "88code", label: "跟随88code", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" }
              ].map(theme => (
                <button
                  key={theme.value}
                  onClick={() => updateSetting("theme", theme.value as ThemeType)}
                  className={`w-full rounded-lg border-2 p-3 text-left transition-colors ${
                    settings.theme === theme.value
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900"
                  }`}>
                  <div className="flex items-center space-x-3">
                    <svg className="h-5 w-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={theme.icon} />
                    </svg>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{theme.label}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* 定时重置设置 */}
          {activeTab === "scheduled" && (
            <div className="space-y-4">
              {/* 功能说明 */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20">
                <div className="flex">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      定时自动重置规则
                    </h3>
                    <div className="mt-1 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <p>系统会在您设定的时间点前的随机分钟内检查额度条件，满足条件时自动重置</p>
                      <p>• 例如：19:00 前 5 分钟，表示在 18:55-19:00 之间随机选择一个时间执行</p>
                      <p>• 每日最多自动重置 2 次，避免频繁重置</p>
                      <p>• 支持配置多个时间窗口，灵活适应不同使用场景</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                    {/* 时间窗口列表 */}
                    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-gray-900 dark:text-white">
                            每日重置时间窗口
                          </label>
                          <button
                            onClick={addWindow}
                            className="rounded-md bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600">
                            + 添加时间窗口
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          配置每天检查和重置额度的时间点，系统会在时间点前随机时间内执行
                        </p>
                      </div>
                      {settings.scheduledReset.windows.map((window, index) => (
                        <div key={index} className="mb-2 rounded-md border border-gray-200 bg-white p-2 dark:border-gray-600 dark:bg-gray-800">
                          <div className="mb-2 flex items-center justify-between">
                            <button
                              onClick={() => updateWindow(index, { ...window, enabled: !window.enabled })}
                              className={`text-xs font-medium ${window.enabled ? "text-green-600" : "text-gray-400"}`}>
                              {window.enabled ? "✓ 启用" : "✗ 禁用"}
                            </button>
                            {settings.scheduledReset.windows.length > 1 && (
                              <button
                                onClick={() => removeWindow(index)}
                                className="text-xs text-red-500 hover:text-red-700">
                                删除
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400">时</label>
                              <input
                                type="number"
                                min="0"
                                max="23"
                                value={window.hour}
                                onChange={(e) => updateWindow(index, { ...window, hour: Number(e.target.value) })}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="0-23"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400">分</label>
                              <input
                                type="number"
                                min="0"
                                max="59"
                                value={window.minute}
                                onChange={(e) => updateWindow(index, { ...window, minute: Number(e.target.value) })}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="0-59"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-500 dark:text-gray-400">提前随机(分钟)</label>
                              <input
                                type="number"
                                min="0"
                                max="10"
                                value={window.randomMinutes}
                                onChange={(e) => updateWindow(index, { ...window, randomMinutes: Number(e.target.value) })}
                                className="w-full rounded border border-gray-300 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                placeholder="0-10"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* 重置条件 */}
                    <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="mb-2">
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                          额度条件设置
                        </label>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          当剩余额度满足条件时才执行重置，避免不必要的重置操作
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            19:00 窗口条件
                          </label>
                          <div className="mt-1 flex items-center space-x-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">额度 &gt;</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={settings.scheduledReset.minCreditsFor19}
                              onChange={(e) => updateScheduledReset("minCreditsFor19", Number(e.target.value))}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              placeholder="1.0"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">时重置</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            00:00 窗口条件
                          </label>
                          <div className="mt-1 flex items-center space-x-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400">额度 ≥</span>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={settings.scheduledReset.minCreditsFor00}
                              onChange={(e) => updateScheduledReset("minCreditsFor00", Number(e.target.value))}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                              placeholder="1.0"
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400">时重置</span>
                          </div>
                        </div>
                      </div>
                    </div>
              </div>
            </div>
          )}
        </div>
      </div>
  )
}
