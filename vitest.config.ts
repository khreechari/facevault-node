import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      // index.ts is a re-export barrel; models.ts is type-only (no runtime).
      exclude: ["src/index.ts", "src/models.ts"],
      thresholds: {
        lines: 90,
        functions: 85,
        branches: 85,
        statements: 90,
      },
    },
  },
});
