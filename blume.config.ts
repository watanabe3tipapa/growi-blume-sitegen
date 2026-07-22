import { defineConfig } from "blume";

export default defineConfig({
  title: "growi-blume-sitegen",
  description: "Blume × GROWI ハイブリッドサイトジェネレーター",
  content: {
    root: "content/pages",
  },
  deployment: {
    site: "https://watanabe3tipapa.github.io",
    base: "/growi-blume-sitegen",
  },
});
