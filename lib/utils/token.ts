/**
 * 清理 token 字符串，去除多余的引号和空格
 */
export function cleanToken(token: string | null | undefined): string | null {
  if (!token) return null

  let cleaned = token.trim()

  while (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim()
  }

  return cleaned || null
}
