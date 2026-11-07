import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export function violations(text) {
  return /supabase|sb_secret_|sb_publishable_|service_role_key/i.test(text);
}
function walk(path) {
  if (!existsSync(path)) return [];
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => {
    const child = resolve(path, entry.name);
    return entry.isDirectory() ? walk(child) : [child];
  });
}
export function checkRuntime({ artifacts = false } = {}) {
  const files = ['backend/src','frontend/src','api','.github/workflows'].flatMap(dir => walk(resolve(root,dir)));
  for (const dir of ['', 'frontend/', 'backend/']) {
    for (const name of ['package.json','package-lock.json','.env.example']) files.push(resolve(root,dir+name));
  }
  files.push(resolve(root,'vercel.json'));
  for (const dir of ['frontend','backend']) files.push(...readdirSync(resolve(root,dir)).filter(name => /\.config\.[cm]?[jt]s$/.test(name)).map(name => resolve(root,dir,name)));
  files.push(...walk(resolve(root,'backend/scripts')), ...walk(resolve(root,'frontend/mocks')));
  if (artifacts) {
    for (const dir of ['backend/dist','frontend/dist']) {
      if (!existsSync(resolve(root,dir))) throw new Error(`Build first: ${dir}`);
      files.push(...walk(resolve(root,dir)));
    }
  }
  const failed = files.filter(file => /\.(?:[cm]?js|tsx?|json|html|css|ya?ml|example)$/.test(file) && violations(readFileSync(file,'utf8')));
  if (failed.length) throw new Error(`Retired provider runtime references: ${failed.map(file => relative(root,file)).join(', ')}`);
  return files.length;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(`Runtime exclusion passed: ${checkRuntime({ artifacts: process.argv.includes('--artifacts') })} files checked.`); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
