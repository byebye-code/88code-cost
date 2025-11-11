/**
 * 日志工具
 * 根据环境变量和配置控制日志输出
 */

type LogLevel = "debug" | "info" | "warn" | "error"

interface LoggerConfig {
  enabled: boolean
  level: LogLevel
  prefix?: string
}

class Logger {
  private config: LoggerConfig

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === "development",
      level: "info",
      ...config
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false

    const levels: LogLevel[] = ["debug", "info", "warn", "error"]
    const currentLevelIndex = levels.indexOf(this.config.level)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex >= currentLevelIndex
  }

  private formatMessage(message: string): string {
    return this.config.prefix ? `[${this.config.prefix}] ${message}` : message
  }

  debug(message: string, ...args: any[]) {
    if (this.shouldLog("debug")) {
      console.log(this.formatMessage(message), ...args)
    }
  }

  info(message: string, ...args: any[]) {
    if (this.shouldLog("info")) {
      console.log(this.formatMessage(message), ...args)
    }
  }

  warn(message: string, ...args: any[]) {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage(message), ...args)
    }
  }

  error(message: string, ...args: any[]) {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage(message), ...args)
    }
  }
}

// 预配置的日志实例
export const popupLogger = new Logger({ prefix: "Popup", level: "info" })
export const apiLogger = new Logger({ prefix: "API", level: "info" })
export const storageLogger = new Logger({ prefix: "Storage", level: "info" })
export const resetLogger = new Logger({ prefix: "ResetTracker", level: "info" })
export const resetTimeLogger = new Logger({ prefix: "ResetTime", level: "info" })
export const backgroundLogger = new Logger({ prefix: "Background", level: "info" })

// 默认导出
export default Logger
