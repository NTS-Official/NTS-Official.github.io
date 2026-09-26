import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// 注意：Astro 的内容集合不支持 .html 条目（glob loader 只注册了 .md/.mdx 等 markdown
// 扩展名，.html 会报 "No entry type found"）。所以正文用 .md，而 Markdown 里本来就
// 允许直接内嵌 HTML，行内样式和链接都不受影响。
//
// 目录按年份分层：src/content/blog/2026/6.md → id "2026/6" → 网址 /blog/2026/6.html
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // 列表页与首页用的摘要，允许内嵌 <a>/<br> 等行内 HTML（用 set:html 渲染）。
    excerpt: z.string(),
    tags: z.array(z.string()).default([]),
    // 已弃用文章：标题自动加 [Deprecated] 前缀，且不会出现在首页"最新动态"里。
    deprecated: z.boolean().default(false),
    // 显式覆盖输出路径（默认按 id 推导为 /blog/<id>.html）。
    permalink: z.string().optional(),
  }),
});

export const collections = { blog };