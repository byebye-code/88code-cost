/**
 * 全局类型声明
 * 支持浏览器扩展 API 和静态资源导入
 */

// 全局 browser 对象（Firefox 原生 API 和 webextension-polyfill）
import type Browser from "webextension-polyfill"

declare global {
  const browser: typeof Browser
}

// 图片资源导入
declare module "*.png" {
  const content: string
  export default content
}

declare module "*.jpg" {
  const content: string
  export default content
}

declare module "*.jpeg" {
  const content: string
  export default content
}

declare module "*.svg" {
  const content: string
  export default content
}

declare module "*.gif" {
  const content: string
  export default content
}

declare module "*.webp" {
  const content: string
  export default content
}

// 导出空对象以确保此文件被视为模块
export {}
