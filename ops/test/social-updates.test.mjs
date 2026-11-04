import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { refreshSocialUpdates } from '../refresh-social-updates.mjs';

const env = { FACEBOOK_PAGE_ID: '123', FACEBOOK_PAGE_ACCESS_TOKEN: 'test-only-token', FACEBOOK_GRAPH_API_VERSION: 'v25.0' };
const post = { id: '123_1', message: 'Test content', created_time: '2026-11-03T00:00:00Z', permalink_url: 'https://www.facebook.com/posts/1', full_picture: 'https://test.fbcdn.net/photo.jpg' };

async function fixture(t) {
  const dir = await mkdtemp(path.join(tmpdir(), 'social-cache-test-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await mkdir(path.join(dir, 'data'));
  const cache = path.join(dir, 'data/social-updates.json');
  await writeFile(cache, '{"updatedAt":null,"posts":[]}');
  return { dir, cache };
}

test('refresh caches images locally, keeps credentials in headers, and avoids unchanged writes', async t => {
  const { dir, cache } = await fixture(t);
  const fetcher = async (url, options) => {
    if (url.hostname === 'graph.facebook.com') {
      assert.equal(options.headers.Authorization, 'Bearer test-only-token');
      assert.equal(url.searchParams.has('access_token'), false);
      return Response.json({ data: [post] });
    }
    return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } });
  };
  await refreshSocialUpdates({ publicDirectory: dir, env, fetcher });
  const first = await readFile(cache, 'utf8');
  const data = JSON.parse(first);
  assert.match(data.posts[0].image, /^images\/social\/[a-f0-9]+\.jpg$/);
  assert.equal((await readFile(path.join(dir, data.posts[0].image))).length, 3);
  assert.equal(first.includes('test-only-token'), false);
  await refreshSocialUpdates({ publicDirectory: dir, env, fetcher });
  assert.equal(await readFile(cache, 'utf8'), first);
});

test('failed provider or image requests preserve the previous public cache', async t => {
  const { dir, cache } = await fixture(t);
  const before = await readFile(cache, 'utf8');
  for (const fetcher of [async () => new Response('', { status: 503 }), async () => Response.json({ data: [{ ...post, full_picture: 'https://evil.example/image.jpg' }] })]) {
    await assert.rejects(refreshSocialUpdates({ publicDirectory: dir, env, fetcher }));
    assert.equal(await readFile(cache, 'utf8'), before);
  }
});

test('latest three include photo-only posts and malformed records never become announcements', async t => {
  const { dir, cache } = await fixture(t);
  const data = [1, 2, 3, 4].map(day => ({ ...post, id: `123_${day}`, created_time: `2026-11-0${day}T00:00:00Z`, message: day === 4 ? undefined : post.message }));
  data.push({ ...post, permalink_url: 'javascript:alert(1)' });
  await refreshSocialUpdates({ publicDirectory: dir, env, fetcher: async url => url.hostname === 'graph.facebook.com' ? Response.json({ data }) : new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/jpeg' } }) });
  const output = JSON.parse(await readFile(cache, 'utf8'));
  assert.deepEqual(output.posts.map(item => item.id), ['123_4', '123_3', '123_2']);
  assert.equal(output.posts[0].title, 'Photo update from the Information Office');
});
