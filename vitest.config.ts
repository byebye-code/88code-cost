import path from "node:path"

import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: [
      "lib/**/*.test.ts",
      "utils/**/*.test.ts"
    ]
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, ".")
    }
  }
})
