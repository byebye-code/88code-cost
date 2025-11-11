import { describe, expect, it } from "vitest"

import { cleanToken } from "./token"

describe("cleanToken", () => {
  it("removes surrounding quotes and whitespace", () => {
    expect(cleanToken('  "abc123"  ')).toBe("abc123")
  })

  it("handles nested quotes", () => {
    expect(cleanToken(" '\"token\"' ")).toBe("token")
  })

  it("returns null when token is empty", () => {
    expect(cleanToken("   ")).toBeNull()
  })

  it("returns null when token is undefined", () => {
    expect(cleanToken(undefined)).toBeNull()
  })
})
