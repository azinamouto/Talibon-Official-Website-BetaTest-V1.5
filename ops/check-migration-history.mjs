import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

// Uses libpq PG* environment variables so credentials never appear in argv.
const result = spawnSync('psql', ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1', '-c',
  'SELECT version FROM supabase_migrations.schema_migrations ORDER BY version'], { encoding: 'utf8' });
if (result.error || result.status !== 0) {
  console.error('Cannot verify remote migration history. Check database access and baseline reconciliation.');
  process.exitCode = 1;
} else {
  const expected = readdirSync(new URL('../supabase/migrations/', import.meta.url))
    .filter(name => name.endsWith('.sql')).map(name => name.split('_')[0]).sort();
  const actual = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    console.error('Migration history differs from the repository; reconcile in staging before release.');
    process.exitCode = 1;
  } else console.log(`Verified ${expected.length} migration versions.`);
}
