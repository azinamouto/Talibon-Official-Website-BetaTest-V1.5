import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const expected = readdirSync(new URL('../backend/database/migrations/',import.meta.url)).filter(name => name.endsWith('.sql')).sort().map(name => `${name}|${createHash('sha256').update(readFileSync(new URL('../backend/database/migrations/'+name,import.meta.url),'utf8').replace(/\r\n/g,'\n')).digest('hex')}`);
const result = spawnSync('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-c',"SELECT version || '|' || checksum FROM public.r2_schema_migrations ORDER BY version"],{encoding:'utf8'});
if (result.error || result.status !== 0 || JSON.stringify(result.stdout.trim().split(/\r?\n/)) !== JSON.stringify(expected)) {
  console.error('R2 migration ledger/checksum verification failed.'); process.exitCode=1;
} else console.log(`Verified ${expected.length} R2 migration checksums.`);
