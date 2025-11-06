/**
 * 使用情况显示组件 - 紧凑版
 */

import React, { useState } from "react"
import { ChevronDown } from "lucide-react"

import type { DashboardData } from "~/types"
import { formatNumber } from "~/lib/utils/format"
import { Card, CardContent, CardHeader } from "~/components/ui/card"
import { Button } from "~/components/ui/button"

interface UsageDisplayProps {
  dashboard: DashboardData
  defaultExpanded?: boolean
}

export function UsageDisplay({ dashboard, defaultExpanded = false }: UsageDisplayProps) {
  const { overview, recentActivity } = dashboard
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <Card>
      <CardHeader className="p-3 pb-2">
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-medium">
            使用统计
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-auto p-1 text-xs">
            <span>{isExpanded ? "收起累计统计" : "展开累计统计"}</span>
            <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0 space-y-2">
        {/* 第一行：今日花费 + 今日请求 */}
        <div className="grid grid-cols-2 gap-2">
          {/* 今日花费 */}
          <div className="rounded-lg bg-destructive/10 p-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">今日花费</div>
            <div className="text-xl font-bold text-destructive">
              ${recentActivity.cost.toFixed(2)}
            </div>
          </div>

          {/* 今日请求 */}
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground mb-1">今日请求</div>
            <div className="text-xl font-semibold text-indigo-600 dark:text-indigo-400">
              {formatNumber(recentActivity.requestsToday, 2, true)}
            </div>
          </div>
        </div>

        {/* 第二行：输入 + 输出（对称） */}
        <div className="grid grid-cols-2 gap-2">
          {/* 今日输入 */}
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">今日输入</div>
            <div className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
              {formatNumber(recentActivity.inputTokensToday)}
            </div>
          </div>

          {/* 今日输出 */}
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">今日输出</div>
            <div className="text-base font-semibold text-cyan-600 dark:text-cyan-400">
              {formatNumber(recentActivity.outputTokensToday)}
            </div>
          </div>
        </div>

        {/* 第三行：缓存创建 + 缓存读取（对称） */}
        <div className="grid grid-cols-2 gap-2">
          {/* 今日缓存创建 */}
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">缓存创建</div>
            <div className="text-base font-semibold text-amber-600 dark:text-amber-400">
              {formatNumber(recentActivity.cacheCreateTokensToday)}
            </div>
          </div>

          {/* 今日缓存读取 */}
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-xs text-muted-foreground">缓存读取</div>
            <div className="text-base font-semibold text-purple-600 dark:text-purple-400">
              {formatNumber(recentActivity.cacheReadTokensToday)}
            </div>
          </div>
        </div>

        {/* 累计统计 - 折叠展示（对称布局） */}
        {isExpanded && (
          <div className="space-y-2 border-t pt-2">
            {/* 第一行：累计花费 + 累计请求 */}
            <div className="grid grid-cols-2 gap-2">
              {/* 累计花费 */}
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">累计花费</div>
                <div className="text-sm font-medium">
                  ${overview.cost.toFixed(2)}
                </div>
              </div>

              {/* 累计请求 */}
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">累计请求</div>
                <div className="text-sm font-medium">
                  {formatNumber(overview.totalRequestsUsed, 2, true)}
                </div>
              </div>
            </div>

            {/* 第二行：累计输入 + 累计输出（对称） */}
            <div className="grid grid-cols-2 gap-2">
              {/* 累计输入 */}
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">累计输入</div>
                <div className="text-sm font-medium">
                  {formatNumber(overview.totalInputTokensUsed)}
                </div>
              </div>

              {/* 累计输出 */}
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">累计输出</div>
                <div className="text-sm font-medium">
                  {formatNumber(overview.totalOutputTokensUsed)}
                </div>
              </div>
            </div>

            {/* 第三行：累计缓存创建 + 累计缓存读取（对称） */}
            <div className="grid grid-cols-2 gap-2">
              {/* 累计缓存创建 */}
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">缓存创建</div>
                <div className="text-sm font-medium">
                  {formatNumber(overview.totalCacheCreateTokensUsed)}
                </div>
              </div>

              {/* 累计缓存读取 */}
              <div className="rounded-md bg-muted/50 p-2">
                <div className="text-xs text-muted-foreground">缓存读取</div>
                <div className="text-sm font-medium">
                  {formatNumber(overview.totalCacheReadTokensUsed)}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
