import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const publicDir = fileURLToPath(new URL('../frontend/public/', import.meta.url));

export function normalizePosts(data) {
  if (!Array.isArray(data)) throw new Error('Invalid Facebook response');
  return data.filter(post => {
    try {
      const url = new URL(post.permalink_url);
      return typeof post.id === 'string' && /^[\w-]+$/.test(post.id) && (typeof post.message === 'string' && post.message.trim() || typeof post.full_picture === 'string') && Number.isFinite(Date.parse(post.created_time)) &&
        url.protocol === 'https:' && ['www.facebook.com', 'facebook.com', 'web.facebook.com'].includes(url.hostname) && !url.username && !url.password;
    } catch { return false; }
  }).sort((a, b) => Date.parse(b.created_time) - Date.parse(a.created_time)).slice(0, 3);
}

async function cacheImage(source, imageDir, fetcher) {
  const url = new URL(source);
  // Do not turn a compromised upstream URL into arbitrary server-side requests.
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.fbcdn.net') || url.username || url.password) throw new Error('Unexpected image host');
  const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('Image download failed');
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const extension = extensions[response.headers.get('content-type')?.split(';')[0]];
  if (!extension) throw new Error('Unsupported image type');
  const chunks = [];
  let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > 5 * 1024 * 1024) { await response.body.cancel().catch(() => {}); throw new Error('Image exceeds 5 MB'); }
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  const filename = `${createHash('sha256').update(bytes).digest('hex').slice(0, 24)}.${extension}`;
  await mkdir(imageDir, { recursive: true });
  await writeFile(path.join(imageDir, filename), bytes);
  return `images/social/${filename}`;
}

export async function refreshSocialUpdates({ publicDirectory = publicDir, env = process.env, fetcher = fetch } = {}) {
  const imageDir = path.join(publicDirectory, 'images/social');
  const cachePath = path.join(publicDirectory, 'data/social-updates.json');
  const { FACEBOOK_PAGE_ID: page, FACEBOOK_PAGE_ACCESS_TOKEN: token, FACEBOOK_GRAPH_API_VERSION: version } = env;
  if (!page || !/^\d+$/.test(page) || !token || !/^v\d+\.\d+$/.test(version || '')) throw new Error('Configure FACEBOOK_PAGE_ID, FACEBOOK_PAGE_ACCESS_TOKEN and FACEBOOK_GRAPH_API_VERSION');
  const url = new URL(`https://graph.facebook.com/${version}/${page}/posts`);
  url.searchParams.set('fields', 'id,message,created_time,permalink_url,full_picture');
  url.searchParams.set('limit', '25');
  const response = await fetcher(url, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000), redirect: 'error' });
  // Never print upstream bodies or URLs: they may include credentials.
  if (!response.ok) throw new Error(`Facebook refresh failed (HTTP ${response.status}); previous cache retained`);
  const body = await response.json();
  const sourcePosts = normalizePosts(body.data);
  if (!sourcePosts.length && body.data.length) throw new Error('No valid posts; previous cache retained');
  const posts = [];
  for (const post of sourcePosts) {
    posts.push({ id: post.id, title: post.message?.trim().slice(0, 220) || 'Photo update from the Information Office', date: post.created_time, url: post.permalink_url,
      image: post.full_picture ? await cacheImage(post.full_picture, imageDir, fetcher) : null });
  }
  // Do not create daily commits when the content has not changed.
  const previous = await readFile(cachePath, 'utf8').then(JSON.parse).catch(() => null);
  if (JSON.stringify(previous?.posts) === JSON.stringify(posts)) return;
  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(`${cachePath}.tmp`, JSON.stringify({ updatedAt: new Date().toISOString(), posts }, null, 2) + '\n');
  await rename(`${cachePath}.tmp`, cachePath);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  refreshSocialUpdates().catch(error => { console.error(error.message?.startsWith('Configure') ? error.message : 'Social cache refresh failed; previous cache retained. Check provider access and image availability.'); process.exitCode = 1; });
}
