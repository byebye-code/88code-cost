/**
 * 未登录空状态组件
 * 友好的引导用户登录
 */

import React from "react"
import { Card, CardContent } from "~/components/ui/card"
import { Button } from "~/components/ui/button"

export function EmptyState() {
  const handleLogin = () => {
    window.open("https://www.88code.org", "_blank")
  }

  return (
    <div className="flex items-center justify-center h-full px-6 py-4">
      <Card className="w-full max-w-md border-none shadow-none">
        <CardContent className="pt-4 pb-4 text-center space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">
              欢迎使用 88Code 计费监控
            </h2>
            <p className="text-xs text-muted-foreground">
              实时监控您的套餐使用情况、额度消耗和 Token 统计
            </p>
          </div>

          <div className="space-y-2 text-left">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-green-600 dark:text-green-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium text-foreground">实时监控套餐额度</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium text-foreground">详细使用统计</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-purple-500/10 flex items-center justify-center">
                <svg
                  className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-xs font-medium text-foreground">一键重置额度</p>
            </div>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                开始使用
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <p className="text-xs text-foreground">
                  点击下方按钮访问 88code.org
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  2
                </div>
                <p className="text-xs text-foreground">
                  使用您的账号登录
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                  3
                </div>
                <p className="text-xs text-foreground">
                  返回此扩展查看数据
                </p>
              </div>
            </div>

            <Button
              onClick={handleLogin}
              size="lg"
              className="w-full font-semibold shadow-lg hover:shadow-xl transition-all"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                />
              </svg>
              前往 88code.org 登录
            </Button>
          </div>

          <div className="space-y-1 pt-1">
            <p className="text-xs text-muted-foreground">
              登录后，扩展将自动同步您的账户数据
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              💡 如已登录，请刷新 88code.org 页面后重试
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
