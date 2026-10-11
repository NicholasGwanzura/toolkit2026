import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // These two React compiler rules flag about 25 existing places (mostly effects that set state from
    // storage or the URL). They are reported as warnings so CI blocks new real errors instead of
    // failing on old ones. Fix them file by file, then turn these back into errors.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      // Only means the compiler skips optimising that component; nothing is broken.
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "_backup_vite/**",
  ]),
]);

export default eslintConfig;
