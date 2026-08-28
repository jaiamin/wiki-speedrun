import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/components/game/**/*.tsx", "src/components/home/**/*.tsx"],
    rules: {
      // Article thumbnails come straight from upload.wikimedia.org, already
      // resized by Wikimedia's own thumbnailer to the exact dimensions we ask
      // for. Routing them through next/image would add an optimization hop for
      // no gain — and the images inside article bodies arrive as raw markup
      // through dangerouslySetInnerHTML, where next/image cannot reach them at
      // all, so plain <img> keeps the two consistent.
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
