// Offline source exports only. Never deletes or overwrites a source or destination.
const fs = require('node:fs');
const path = require('node:path');
const { validateFile, checksum } = require('../dist/storage/file-validation');
const { NeonObjectStore } = require('../dist/storage/neon-object-store');
async function reconcile(manifest, root, store, copy = false) {
  if (!Array.isArray(manifest) || manifest.length > 10000) throw new Error('Invalid manifest');
  const seen = new Set(); const results = [];
  const directory = fs.realpathSync(root);
  for (const entry of manifest) {
    if (!/^migration\/[a-f0-9]{64}$/.test(entry.key) || !/^[a-f0-9]{64}$/.test(entry.sha256) || entry.key !== `migration/${entry.sha256}` || seen.has(entry.key)) throw new Error('Invalid or duplicate destination');
    seen.add(entry.key);
    const source = fs.realpathSync(path.resolve(directory,entry.file));
    const relative = path.relative(directory,source);
    if (relative.startsWith('..') || path.isAbsolute(relative) || !fs.statSync(source).isFile() || fs.statSync(source).size > 2097152) throw new Error('Unsafe source');
    const bytes = fs.readFileSync(source);
    const valid = await validateFile(path.basename(source),entry.mime,bytes);
    if (valid.sha256 !== entry.sha256 || valid.bytes !== entry.bytes) throw new Error('Source checksum mismatch');
    if (!store) { results.push({ key: entry.key, status: 'source-verified' }); continue; }
    await store.verifyPrivate();
    let target;
    try { target = await store.read(entry.key); }
    catch (error) { if (error.name !== 'NoSuchKey') throw error; }
    if (target && checksum(target) !== entry.sha256) throw new Error('Destination conflict; never overwritten');
    if (!target && copy) {
      await store.put(entry.key,bytes,entry.mime);
      target = await store.read(entry.key);
      if (checksum(target) !== entry.sha256) throw new Error('Destination reconciliation failed');
    }
    results.push({ key: entry.key, status: target ? 'reconciled' : 'missing' });
  }
  return results;
}
module.exports = { reconcile };
if (require.main === module) (async () => {
  const [manifestFile,root,...flags] = process.argv.slice(2);
  if (!manifestFile || !root || flags.some(f => !['--verify-target','--copy'].includes(f))) throw new Error();
  const target = flags.length > 0;
  // Explicitly restricted to this isolated development branch. No production CLI mode.
  if (target && new URL(process.env.AWS_ENDPOINT_URL_S3).hostname.split('.')[0] !== 'br-bold-art-aolg7usz') throw new Error();
  const results = await reconcile(JSON.parse(fs.readFileSync(manifestFile,'utf8')),root,target ? new NeonObjectStore() : undefined,flags.includes('--copy'));
  console.log(JSON.stringify({ mode: flags.includes('--copy') ? 'copy' : 'dry-run', results },null,2));
  if (results.some(row => row.status === 'missing')) process.exitCode = 1;
})().catch(() => { console.error('Media reconciliation failed; no source or destination was deleted.'); process.exitCode = 1; });
