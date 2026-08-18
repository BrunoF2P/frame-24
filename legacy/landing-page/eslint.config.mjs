import { defineConfig } from "eslint/config";
import { nextJsConfig } from "@repo/eslint-config/next-js";

export default defineConfig([
  ...nextJsConfig,
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"],
  },
]);
