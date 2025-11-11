/**
 * LoginPrompt 组件
 * 当用户未登录或 token 失效时，引导用户前往登录
 */

import { browserAPI } from "~/lib/browser-api"

interface LoginPromptProps {
  onRetry?: () => void
}

export default function LoginPrompt({ onRetry }: LoginPromptProps) {
  const handleOpenLoginPage = async () => {
    try {
      await browserAPI.tabs.create({
        url: "https://www.88code.org/user/login"
      })
    } catch (error) {
      console.error("[LoginPrompt] 打开登录页面失败:", error)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] px-6 py-8 text-center">
      {/* Logo 或图标 */}
      <div className="mb-6">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      </div>

      {/* 提示信息 */}
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        需要登录
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-xs">
        请先登录 88code.org 以查看您的套餐使用情况
      </p>

      {/* 操作按钮 */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={handleOpenLoginPage}
          className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg"
        >
          前往登录
        </button>

        {onRetry && (
          <button
            onClick={onRetry}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            重新检查
          </button>
        )}
      </div>

      {/* 提示信息 */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-blue-700 dark:text-blue-300">
          💡 提示：登录后点击"重新检查"即可加载数据
        </p>
      </div>
    </div>
  )
}
