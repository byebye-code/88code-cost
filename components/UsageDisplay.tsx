/**
 * 使用情况显示组件 - 紧凑版
 */

import React, { useState } from "react"

import type { DashboardData } from "~/types"
import { formatNumber } from "~/lib/utils/format"

interface UsageDisplayProps {
  dashboard: DashboardData
  defaultExpanded?: boolean
}

export function UsageDisplay({ dashboard, defaultExpanded = false }: UsageDisplayProps) {
  const { overview, recentActivity } = dashboard
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <div className="rounded-lg border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm dark:border-gray-700 dark:from-gray-800 dark:to-gray-850">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          使用统计
        </h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300">
          <span>{isExpanded ? "收起详情" : "展开详情"}</span>
          <svg
            className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* 基础统计 - 2x2 网格布局 */}
      <div className="grid grid-cols-2 gap-2">
        {/* 今日花费 */}
        <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
          <div className="text-xs text-gray-500 dark:text-gray-400">今日花费</div>
          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
            ${recentActivity.cost.toFixed(2)}
          </div>
        </div>

        {/* 总花费 */}
        <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
          <div className="text-xs text-gray-500 dark:text-gray-400">总花费</div>
          <div className="text-sm font-semibold text-red-600 dark:text-red-400">
            ${overview.cost.toFixed(2)}
          </div>
        </div>

        {/* 今日请求 */}
        <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
          <div className="text-xs text-gray-500 dark:text-gray-400">今日请求</div>
          <div className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            {formatNumber(recentActivity.requestsToday, 2, true)}
          </div>
        </div>

        {/* 总请求 */}
        <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
          <div className="text-xs text-gray-500 dark:text-gray-400">总请求</div>
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {formatNumber(overview.totalRequestsUsed, 2, true)}
          </div>
        </div>
      </div>

      {/* 详细统计 - 折叠展示 */}
      {isExpanded && (
        <div className="mt-2 grid grid-cols-2 gap-2 border-t border-gray-200 pt-2 dark:border-gray-700">
          {/* 今日输入 */}
          <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400">今日输入</div>
            <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              {formatNumber(recentActivity.inputTokensToday)}
            </div>
          </div>

          {/* 总输入 */}
          <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400">总输入</div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formatNumber(overview.totalInputTokensUsed)}
            </div>
          </div>

          {/* 今日输出 */}
          <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400">今日输出</div>
            <div className="text-sm font-semibold text-cyan-600 dark:text-cyan-400">
              {formatNumber(recentActivity.outputTokensToday)}
            </div>
          </div>

          {/* 总输出 */}
          <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400">总输出</div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formatNumber(overview.totalOutputTokensUsed)}
            </div>
          </div>

          {/* 今日缓存创建 */}
          <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400">今日缓存创建</div>
            <div className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {formatNumber(recentActivity.cacheCreateTokensToday)}
            </div>
          </div>

          {/* 总缓存创建 */}
          <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400">总缓存创建</div>
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formatNumber(overview.totalCacheCreateTokensUsed)}
            </div>
          </div>

          {/* 今日缓存读取 */}
          <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400">今日缓存读取</div>
            <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {formatNumber(recentActivity.cacheReadTokensToday)}
            </div>
          </div>

          {/* 总缓存读取 */}
          <div className="rounded-md bg-white/50 p-2 dark:bg-gray-700/30">
            <div className="text-xs text-gray-500 dark:text-gray-400">总缓存读取</div>
            <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {formatNumber(overview.totalCacheReadTokensUsed)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
