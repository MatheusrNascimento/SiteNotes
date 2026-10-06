import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporters: ["text-summary", "lcov"],
      exclude: ["build.mjs", "test/**", "manifests/**", "static/**", "dist/**"],
      // Medido com "npm test" em outubro/2026: lines 92.64%, branches 78.13%, functions 92.53%,
      // statements 92.38%. Piso um pouco abaixo do valor real para o gate comecar verde sem
      // travar o CI com um numero arbitrario; subir gradualmente conforme a suite cresce.
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 75,
        statements: 90,
      },
    },
  },
});
