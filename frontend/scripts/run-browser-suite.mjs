import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const suites = {
  browser: { config: 'playwright.config.ts', minimum: 200, files: ['foundation.spec.ts', 'staff-login.spec.ts', 'staff-recovery-disabled.spec.ts', 'municipal-offices.spec.ts', 'media.spec.ts', 'connect-talibon.spec.ts', 'emergency-theme.spec.ts', 'five-section-refinements.spec.ts', 'three-ui-fixes.spec.ts', 'decorative-icons.spec.ts'] },
  admin: { config: 'playwright.admin.config.ts', minimum: 5, files: ['admin.spec.ts'] },
  contracts: { config: 'playwright.contract.config.ts', minimum: 10, files: ['about-contract.spec.ts', 'public-contract.spec.ts', 'search-contract.spec.ts'] },
  login: { config: 'playwright.staff.config.ts', minimum: 21, files: ['staff-login.spec.ts', 'foundation.spec.ts', 'staff-recovery-disabled.spec.ts', 'staff-recovery-enabled.spec.ts'] },
  eservices: { config: 'playwright.eservices.config.ts', minimum: 23, files: ['eservices.spec.ts'] },
};
const [name, ...args] = process.argv.slice(2);
const suite = Object.hasOwn(suites, name) ? suites[name] : undefined;
if (name === 'browser' && process.env.TALWEB_OFFICES_BASELINE === '1') {
  throw new Error('Release verification cannot run in municipal baseline-capture mode');
}
if (!suite || !existsSync(suite.config) || suite.files.some(file => !existsSync(resolve('test/browser', file)))) {
  throw new Error('Required browser configuration or suite is missing');
}
// Filters can never replace the dedicated configuration or mandatory reporter.
if (args.some(arg => /^(?:--config|--reporter|--project|--pass-with-no-tests|--list)(?:=|$)|^-c$/.test(arg))) {
  throw new Error('Browser gate configuration cannot be overridden');
}
if (name !== 'eservices' && args.some(arg => /^(?:--grep|--grep-invert|--shard|--test-list|--last-failed|--only-changed)(?:=|$)|^-g$/.test(arg))) {
  throw new Error('Required browser suites must execute without selection filters');
}
const child = spawn(process.execPath, [resolve('node_modules/@playwright/test/cli.js'), 'test', ...args,
  '--config', suite.config, '--forbid-only', '--reporter', 'list,./scripts/strict-browser-reporter.mjs'], {
  stdio: 'inherit', env: { ...process.env, TALGOV_BROWSER_SUITE: name,
    TALGOV_EXPECTED_BROWSER_FILES: JSON.stringify(suite.files),
    TALGOV_MINIMUM_BROWSER_TESTS: String(name === 'eservices' && args.length === 2 && args[0] === '--grep' && args[1] === 'payments remain unavailable by default' ? 1 : suite.minimum),
    VITE_STAFF_PASSWORD_RECOVERY_ENABLED: 'false' },
});
child.on('error', () => { process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
