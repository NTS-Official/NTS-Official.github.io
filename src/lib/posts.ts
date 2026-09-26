import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'blog'>;

/**
 * 文章在站点上的路径。
 * id 形如 "2026/6"（glob loader 会去掉 .md 扩展名），
 * 产物则因为 build.format:'preserve' 落在 /blog/2026/6.html，与迁移前的网址完全一致。
 */
export function postPath(post: Post): string {
  return post.data.permalink ?? `/blog/${post.id}.html`;
}

/** 2026年4月30日 —— 按 UTC 取值，保证在任何时区的构建机上结果一致 */
export function formatDate(date: Date): string {
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}

/** 按发布日期倒序（同日按 id 倒序，保证"最新一篇"稳定） */
export function sortByDateDesc(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => {
    const diff = b.data.pubDate.getTime() - a.data.pubDate.getTime();
    return diff !== 0 ? diff : b.id.localeCompare(a.id);
  });
}

/** 全站文章，日期倒序 */
export async function getSortedPosts(): Promise<Post[]> {
  return sortByDateDesc(await getCollection('blog'));
}

/** 首页用：排除已弃用文章，避免 [Deprecated] 的内容占据"最新动态" */
export async function getLatestPost(): Promise<Post | undefined> {
  const posts = await getSortedPosts();
  return posts.find((post) => !post.data.deprecated) ?? posts[0];
}

/** 列表卡片上的显示标题，deprecated 的文章带 [Deprecated] 前缀 */
export function displayTitle(post: Post): string {
  return post.data.deprecated ? `[Deprecated] ${post.data.title}` : post.data.title;
}