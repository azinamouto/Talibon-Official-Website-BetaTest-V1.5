const { connectionConfig } = require('../../dist/database/postgres.js');
const target = Object.freeze(require('./target.json'));
const denied = ['br-flat-shape-aoyf83yq', 'br-bitter-fire-aouffr8u', 'br-bold-art-aolg7usz'];
function validateTarget(t) {
  if (t.project !== target.project || t.database !== 'neondb' ||
      !/^br-[a-z0-9-]+$/.test(t.branch || '') || denied.includes(t.branch) ||
      t.name !== 'staging-talgov-r2' || !/^ep-[a-z0-9-]+$/.test(t.endpoint || '') ||
      !t.host?.startsWith(t.endpoint + '.') || !t.host.endsWith('.neon.tech') ||
      t.host.includes('pooler') || t.databaseOwner !== 'neondb_owner' || t.migrationLogin === t.databaseOwner ||
      t.migrationLogin === 'talgov_runtime' || !/^[a-z_][a-z0-9_]*$/.test(t.migrationLogin || '')) throw new Error();
}
function validateMetadata(t, p, b, e) {
  validateTarget(t);
  if (p.id !== t.project || p.org_id !== t.organization || p.region_id !== t.region || p.pg_version !== 18 ||
      b.id !== t.branch || b.project_id !== t.project || b.name !== t.name || b.default !== false || b.primary === true ||
      e.id !== t.endpoint || e.project_id !== t.project || e.branch_id !== t.branch ||
      e.host !== t.host || e.type !== 'read_write') throw new Error();
}
async function verifyTarget(token) {
  validateTarget(target);
  if (!token) throw new Error();
  async function get(route) {
    const response = await fetch('https://console.neon.tech/api/v2/projects/' + target.project + route, {
      headers: { Authorization: 'Bearer ' + token }, redirect: 'error', signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error();
    return response.json();
  }
  const p = await get('');
  const b = await get('/branches/' + target.branch);
  const e = await get('/endpoints/' + target.endpoint);
  validateMetadata(target, p.project, b.branch, e.endpoint);
}
function config(url) {
  validateTarget(target);
  const u = new URL(url);
  if (u.hostname !== target.host || (u.port && u.port !== '5432') || u.pathname !== '/neondb' ||
      decodeURIComponent(u.username) !== target.migrationLogin || !u.password ||
      u.searchParams.get('channel_binding') !== 'require' || u.searchParams.get('sslmode') !== 'verify-full') throw new Error();
  return connectionConfig(url);
}
module.exports = { target, validateTarget, validateMetadata, verifyTarget, config };
