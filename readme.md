# NoTuring_Steve 的个人页面
### 我觉得没有人会想要看这个
<https://nts-official.github.io/>

以前是 11 个手写 HTML：每发一篇文章都要复制一遍 header/nav/footer、手动往列表页插卡片、
手动把最新一篇同步到首页，导航里的相对路径还抄错了好几处（`blog/index.html` 里写
`blog/index.html`、`about/index.html`，从 `blog/` 下点全是 404）。

现在改成 **Astro** 静态生成：内容与模板分离，列表页和首页自动生成，**博客的文章网址保持不变**。

站点包含两部分，设计体系完全不同，所以各自独立：

| | 页面 | 样式 | 布局 |
| --- | --- | --- | --- |
| 博客 | 首页 / 动态列表 / 文章 / 关于 / 404 | `public/assets/style/*.css` | `src/layouts/BaseLayout.astro` |
| 团队 | `/team/` | `src/styles/team.css` | 自成一体，不复用 BaseLayout |

## 日常使用

```bash
npm install          # 首次
npm run dev          # 本地预览 http://localhost:4321
npm run build        # 产物输出到 dist/
npm run preview      # 预览 dist/ 的构建结果
```

## 发一篇文章

```bash
npm run new "文章标题" -- --tags "Kotlin,Neoforge"
```

会在 `src/content/blog/<年份>/` 下按序号生成一个文件，例如 `src/content/blog/2026/8.md`。
打开它，填好两处内容即可：

```html
---
{
  "title": "文章标题",
  "pubDate": "2026-05-10",
  "excerpt": "显示在列表页和首页的摘要。<br><span style=\"color: #2563eb;\"><a href=\"...\">链接</a></span>",
  "tags": ["Kotlin", "Neoforge"],
  "deprecated": false
}
---
<p>正文写这里，可以直接内嵌 HTML。</p>
```

| 字段 | 说明 |
| --- | --- |
| `title` | 标题。`deprecated: true` 时列表页会自动加 `[Deprecated]` 前缀，且不出现在首页 |
| `pubDate` | 发布日期，列表按它倒序排列 |
| `updatedDate` | 可选，填了文章页会多显示"🔄 更新于 …" |
| `excerpt` | 摘要，**必填**，允许内嵌行内 HTML |
| `tags` | 标签数组 |
| `permalink` | 可选，显式指定该文的输出路径（默认按文件名推导） |

要点：

- **frontmatter 用 JSON 而不是 YAML**。JSON 是 YAML 的子集，所以标题/摘要里的引号、冒号、反斜杠都不用手工转义——这原本是这个项目最容易踩的坑。
- **正文是 `.md`**，但里面直接写 HTML 完全可以。文件名决定网址：`2026/8.md` → `/blog/2026/8.html`。
- 新建脚本分配文件名时会同时检查 `.md` 和 `.html`，并以 `flag:'wx'` 写入，**不会覆盖已有文章**。
- 发布 = `git push` 到 `personal` 分支，GitHub Actions 自动构建部署。

## 编辑团队页

页面：`src/pages/team/index.astro`，样式：`src/styles/team.css`。

成员和作品是数据驱动的，加人/加作品只要在文件顶部的 `members` / `works` 数组里加一条，
不用碰 HTML：

```js
const members = [
  { avatar: '林', name: 'Stargray Lin', role: '创始人', bio: '……',
    socials: [{ href: 'https://github.com/…', icon: 'fab fa-github', label: 'GitHub' }] },
];
```

作品的 `image` 留空时不会输出 background-image。
（原来两个作品卡里把 `<!--占位注释-->` 塞进了 `url()`，会产生非法 CSS，已移除。）

## 为什么博客文章网址没变

旧网址是 `/blog/2026/6.html` 这种带 `.html` 的形式。Astro 的 `build.format` 默认是 `'directory'`，
会把页面输出成 `6.html/index.html`，把所有既有链接打断，所以 `astro.config.mjs` 里设成：

```js
build: { format: 'preserve' }   // 保留 .html 扩展名；index.astro 仍输出 index.html
trailingSlash: 'ignore'         // 页面间混用 index.html 与 2026/6.html 两种链接
```

团队页的网址是 `/team/`（产物 `dist/team/index.html`）。注意 `preserve` 下带斜杠的
非 index 路由会输出成 `x/index.html`，所以 `/team/` 可用，但 `/team` 无斜杠形式不行——
站内链接统一写 `/team/`。

## 目录结构

```
public/assets/               博客的静态资源，原样复制到 dist/assets/
  style/  pictures/
src/
  content.config.ts          文章 frontmatter 的 schema（zod 校验，字段写错构建即报错）
  content/blog/2026/*.md     文章正文
  layouts/BaseLayout.astro   博客 header / nav / footer 的唯一来源
  lib/posts.ts               排序、日期格式化、路径推导
  styles/team.css            团队页样式（由 Astro 打包）
  pages/
    index.astro              博客首页（自动取最新一篇，已弃用的会被跳过）
    blog/index.astro         动态列表（自动按日期排序）
    blog/[...slug].astro     文章详情
    about/index.astro        关于
    team/index.astro         星辰元素团队页
    404.astro                自定义 404
scripts/
  astro.mjs                  跨平台的 astro 包装器（见下）
  new-post.mjs               新建文章
.github/workflows/deploy.yml 构建并部署到 GitHub Pages
```
## scripts/astro.mjs 是干什么的

一个 20 行的包装器，把 astro 命令的环境变量处理掉：

1. npm 在 Windows 上用 `cmd` 执行 scripts，`VAR=value astro build` 这种 POSIX 前缀语法会直接报错，
   所以环境变量不能写进 `package.json` 的 scripts。用它就不需要再引入 `cross-env`。
2. Astro 遥测默认会在 workspace 之外（`%APPDATA%\astro`）建目录，在受限环境里会崩。
   包装器统一注入 `ASTRO_TELEMETRY_DISABLED=1`。
3. 用 `stdio: 'inherit'` 而不是管道，输出实时透传。

## 部署（重要：需要手动做一次设置）

**仓库 Settings → Pages → Build and deployment → Source 必须选 "GitHub Actions"。**

目前这里是失效状态：旧的 "Deploy from a branch" 源指向的分支根目录已经没有 `index.html` 了
（旧手写页面本次迁移已删除），而 Actions 源又没开启，所以在开启之前部署不可能成功。

workflow 里的分支必须与默认分支一致：**本仓库默认分支是 `personal`，不是 `main`**。
写错分支时 workflow 会静默地完全不触发。

排查用：
```bash
gh run list --limit 10          # 需要 gh CLI
```
`startup_failure` 表示 workflow 根本没启动（YAML 或权限问题），不是构建失败。
