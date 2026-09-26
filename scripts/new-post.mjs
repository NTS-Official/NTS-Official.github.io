#!/usr/bin/env node
// 用法： npm run new "文章标题" -- --tags "Kotlin,Neoforge" --date 2026-05-10
// 产物： src/content/blog/<年>/<序号>.md
//
// 关于正文用 .md 而不是 .html：Astro 的内容集合不支持 .html 条目
// （glob loader 会报 "No entry type found"）。Markdown 里可以直接内嵌 HTML。
//
// 文件名分配是防御式的：同时看 .md 和 .html，并在写入前逐个复核文件是否已存在，
// 绝不覆盖已有文章。曾经因为只扫 .html、且写入前不复核，误覆盖过一篇文章。
import { mkdir, readdir, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const title = argv.find((a) => !a.startsWith('--'));

if (!title) {
  console.error('用法: npm run new "文章标题" [-- --tags "a,b" --date YYYY-MM-DD]');
  process.exit(1);
}

const flag = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const exists = async (p) => access(p).then(() => true, () => false);

const today = new Date().toISOString().slice(0, 10);
const date = flag('date', today);
const tags = flag('tags', '').split(',').map((t) => t.trim()).filter(Boolean);

const year = date.slice(0, 4);
const yearDir = join(root, 'src', 'content', 'blog', year);
await mkdir(yearDir, { recursive: true });

// 该年已占用的序号，.md 与 .html 一起统计，避免撞号
const existing = await readdir(yearDir);
const used = new Set(
  existing
    .map((f) => /^(\d+)\.(?:md|html)$/.exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1])),
);

// 从最大序号 +1 开始，逐个复核直到找到真正空闲的名字
let n = (used.size ? Math.max(...used) : 0) + 1;
while (await exists(join(yearDir, `${n}.md`))) n += 1;

const abs = join(yearDir, `${n}.md`);

// 双保险：再确认一次
if (await exists(abs)) {
  console.error(`目标文件已存在，已中止以免覆盖文章: ${abs}`);
  process.exit(1);
}

// 用 JSON 作为 YAML frontmatter：JSON 是 YAML 的子集，
// 标题/摘要里的引号、冒号、反斜杠都不必手工转义。
const frontmatter = {
  title,
  pubDate: date,
  excerpt: '这里写摘要，会显示在列表页和首页（允许内嵌 <a> 等行内 HTML）。',
  tags,
  deprecated: false,
};

const content = `---
${JSON.stringify(frontmatter, null, 2)}
---
<p>正文写这里，可以直接内嵌 HTML。</p>
`;

// flag 'wx'：文件已存在则直接失败，从系统调用层面杜绝覆盖
await writeFile(abs, content, { encoding: 'utf8', flag: 'wx' }).catch((err) => {
  if (err.code === 'EEXIST') {
    console.error(`目标文件已存在，已中止以免覆盖文章: ${abs}`);
    process.exit(1);
  }
  throw err;
});

console.log(`已创建 src/content/blog/${year}/${n}.md`);
console.log('提示：excerpt 是列表页摘要，记得改掉占位文字。');