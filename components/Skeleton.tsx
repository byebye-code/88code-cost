/**
 * 骨架屏组件
 */

import React from "react"

/**
 * 基础骨架屏块
 */
function SkeletonBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gray-200 dark:bg-gray-700 ${className}`}
    />
  )
}

/**
 * 使用情况骨架屏
 */
export function UsageDisplaySkeleton() {
  return (
    <div className="space-y-4">
      {/* 今日使用情况 */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <SkeletonBlock className="mb-3 h-5 w-24" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
        </div>
      </div>

      {/* 总体统计 */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <SkeletonBlock className="mb-3 h-5 w-20" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <SkeletonBlock className="h-4 w-16" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <SkeletonBlock className="h-4 w-20" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
          <div className="flex justify-between">
            <SkeletonBlock className="h-4 w-12" />
            <SkeletonBlock className="h-4 w-20" />
          </div>
          <div className="flex justify-between">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 订阅卡片骨架屏
 */
export function SubscriptionCardSkeleton() {
  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-5 w-16" />
        </div>
        <SkeletonBlock className="h-4 w-12" />
      </div>

      <div className="mb-2 space-y-1">
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-20" />
        </div>
        <div className="flex justify-between">
          <SkeletonBlock className="h-4 w-16" />
          <SkeletonBlock className="h-4 w-12" />
        </div>
      </div>

      {/* 进度条 */}
      <SkeletonBlock className="mb-3 h-2 w-full" />

      {/* 订阅信息 */}
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-3 w-20" />
        <SkeletonBlock className="h-3 w-28" />
      </div>
    </div>
  )
}
