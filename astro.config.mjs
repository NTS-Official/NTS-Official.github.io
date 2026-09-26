// @ts-check
import { defineConfig } from 'astro/config';

// NTS-Official.github.io 是 GitHub 组织主页仓库，站点直接位于域名根目录。
export default defineConfig({
  site: 'https://nts-official.github.io',

  // 关键：保留 .html 扩展名。
  // 现有文章 URL 形如 /blog/2026/6.html，且 blog/index.html 里的链接就写着 "2026/6.html"。
  // 若用 Astro 默认的 'directory'，会产出 6.html/index.html，把既有网址全部打断。
  build: {
    format: 'preserve',
  },

  // 页面之间混用 "index.html" 与 "2026/6.html" 两种链接，因此不做斜杠规范化。
  trailingSlash: 'ignore',

  // publicDir 用 Astro 默认的 ./public。
  // 静态资源放在 public/assets/ 下，于是产物是 dist/assets/...，公开网址
  // /assets/style/main.css 与迁移前完全一致（外部引用零风险）。
  // 注意：不要直接写 publicDir: './assets'。Vite 会把 publicDir 的"内容"
  // 铺到 dist 根，那样产物会变成 dist/style/... 而页面里引用的还是
  // /assets/style/... ，全站资源 404。
});