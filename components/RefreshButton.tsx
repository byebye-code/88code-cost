/**
 * 刷新按钮组件
 */

import React from "react"

interface RefreshButtonProps {
  loading: boolean
  onRefresh: () => void
}

export function RefreshButton({ loading, onRefresh }: RefreshButtonProps) {
  return (
    <button
      className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
      disabled={loading}
      onClick={onRefresh}
      title="自动刷新：每 30 秒">
      <svg
        className={`h-4 w-4 text-gray-600 dark:text-gray-300 ${loading ? "animate-spin" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg">
        <path
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
        />
      </svg>
    </button>
  )
}
