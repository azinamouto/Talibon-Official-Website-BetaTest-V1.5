export interface SocialPost { id: string; title: string; date: string; url: string; image: string | null }
export interface SocialCache { updatedAt: string | null; posts: SocialPost[] }

/** Allow only locally cached images and HTTPS Facebook permalinks. */
export function parseSocialCache(value: unknown): SocialCache {
  if (!value || typeof value !== "object" || !("posts" in value) || !Array.isArray(value.posts)) throw new Error("Invalid social cache");
  const posts = value.posts.filter((post): post is SocialPost => {
    if (!post || typeof post !== "object" || typeof post.id !== "string" || typeof post.title !== "string" || !post.title.trim() || typeof post.date !== "string" || !Number.isFinite(Date.parse(post.date))) return false;
    try {
      const url = new URL(post.url);
      return url.protocol === "https:" && ["www.facebook.com", "facebook.com", "web.facebook.com"].includes(url.hostname) && !url.username && !url.password &&
        (post.image === null || (typeof post.image === "string" && /^images\/social\/[a-zA-Z0-9_-]+\.(jpg|png|webp)$/.test(post.image)));
    } catch { return false; }
  }).sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 3);
  const updatedAt = "updatedAt" in value && typeof value.updatedAt === "string" && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : null;
  return { updatedAt, posts };
}
