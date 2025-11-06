/**
 * 设置面板组件
 */

import React from "react"
import type { AppSettings } from "~/types"

interface SettingsPanelProps {
  settings: AppSettings
  onSave: (settings: Partial<AppSettings>) => Promise<boolean>
  onReset: () => Promise<boolean>
  onClose: () => void
}

export function SettingsPanel({ settings, onSave, onReset, onClose }: SettingsPanelProps) {

  // 更新定时重置设置并立即保存
  const updateScheduledReset = async <K extends keyof AppSettings["scheduledReset"]>(
    key: K,
    value: AppSettings["scheduledReset"][K]
  ) => {
    await onSave({
      scheduledReset: { ...settings.scheduledReset, [key]: value }
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">定时重置设置</h2>
      </div>

        {/* 内容区域 */}
        <div className="max-h-[520px] overflow-y-auto p-4">
          {/* 定时重置设置 */}
          <div className="space-y-4">
              {/* 功能说明 */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-900/20">
                <div className="flex">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      智能定时重置策略
                    </h3>
                    <div className="mt-2 text-xs text-blue-700 dark:text-blue-300 space-y-2">
                      <div>
                        <p className="font-semibold">🕐 18:55 智能重置</p>
                        <p className="mt-0.5 ml-4">• 最大化利用重置窗口（5小时间隔规则）</p>
                        <p className="ml-4">• 剩余重置次数 &gt; 1 且未满额：立即重置</p>
                        <p className="ml-4">• 保留最后 1 次给晚间兜底</p>
                      </div>
                      <div>
                        <p className="font-semibold">🕚 23:55 兜底重置</p>
                        <p className="mt-0.5 ml-4">• 重置所有还有重置次数的套餐</p>
                        <p className="ml-4">• 确保不浪费每日额度</p>
                      </div>
                      <div className="pt-1 border-t border-blue-300 dark:border-blue-700">
                        <p>• 满额套餐不会重置</p>
                        <p>• 随机延迟 0-15 秒，分散服务器压力</p>
                        <p>• 浏览器后台自动执行，无需打开插件</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 开关控制 */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-white">
                      启用定时重置
                    </label>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      在后台自动重置套餐额度
                    </p>
                  </div>
                  <button
                    onClick={() => updateScheduledReset("enabled", !settings.scheduledReset.enabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      settings.scheduledReset.enabled
                        ? "bg-blue-600"
                        : "bg-gray-200 dark:bg-gray-700"
                    }`}>
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.scheduledReset.enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* 状态展示 */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-900 dark:text-white">
                    执行状态
                  </label>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">当前状态：</span>
                    <span className={`font-medium ${settings.scheduledReset.enabled ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}>
                      {settings.scheduledReset.enabled ? "✓ 已启用" : "✗ 已禁用"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">执行时间：</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      18:55, 23:55
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">随机延迟：</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      0-15 秒
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">运行方式：</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      浏览器后台
                    </span>
                  </div>
                </div>
              </div>
          </div>
        </div>
    </div>
  )
}
