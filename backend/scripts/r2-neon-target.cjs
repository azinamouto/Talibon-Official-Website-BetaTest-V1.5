// Explicit Increment 2.1 development target. This is not a generic remote-write switch.
const { execFileSync } = require('node:child_process');
const { connectionConfig } = require('../dist/database/postgres.js');
const target = Object.freeze({ project: 'misty-silence-69777617', branch: 'br-bitter-fire-aouffr8u',
  name: 'dev-talgov-r2-foundation', parent: 'br-flat-shape-aoyf83yq', endpoint: 'ep-bold-bread-aof0cgtb',
  host: 'ep-bold-bread-aof0cgtb.c-2.ap-southeast-1.aws.neon.tech', region: 'aws-ap-southeast-1' });
function api(route) {
  if (!/^\/projects\/[a-z0-9/-]+$/.test(route)) throw new Error('Invalid metadata route');
  return JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-Command', `& neon api ${route} --output json --no-analytics`],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}
function validateMetadata(project, branch, endpoint) {
  if (project.id !== target.project || project.org_id !== 'org-patient-mud-50407342' || project.region_id !== target.region || project.pg_version !== 18 ||
      branch.id !== target.branch || branch.project_id !== target.project || branch.name !== target.name || branch.parent_id !== target.parent || branch.default || branch.primary ||
      endpoint.id !== target.endpoint || endpoint.branch_id !== target.branch || endpoint.project_id !== target.project || endpoint.host !== target.host || endpoint.type !== 'read_write') {
    throw new Error('Neon development identity mismatch');
  }
}
function verifyTarget() {
  const p = api(`/projects/${target.project}`);
  const b = api(`/projects/${target.project}/branches/${target.branch}`);
  const e = api(`/projects/${target.project}/endpoints`);
  validateMetadata(p.project || p, b.branch || b, e.endpoints.find(x => x.id === target.endpoint) || {});
  return target;
}
function neonConfig(url, { pooled = false, databases = ['neondb'] } = {}) {
  try {
    const u = new URL(url);
    const host = pooled ? target.host.replace('.c-2.', '-pooler.c-2.') : target.host;
    if (u.hostname !== host || (u.port && u.port !== '5432') || !databases.includes(u.pathname.slice(1)) ||
        !u.username || !u.password || u.searchParams.get('channel_binding') !== 'require' ||
        !['require', 'verify-full'].includes(u.searchParams.get('sslmode'))) throw new Error();
    return connectionConfig(url);
  } catch { throw new Error('Neon development URL rejected'); }
}
module.exports = { target, verifyTarget, validateMetadata, neonConfig };
