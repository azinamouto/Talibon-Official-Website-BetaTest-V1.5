// Read-only audit for the explicitly approved staging target. Never prints URLs or credentials.
const { Pool } = require('pg');
const { runtimeConnectionConfig } = require('../dist/database/postgres');
const expected = require('./staging/catalog.json');

async function main() {
  const raw = process.env.R2_AUDIT_DATABASE_URL;
  delete process.env.R2_AUDIT_DATABASE_URL;
  const url = new URL(raw);
  if (url.hostname !== 'ep-sparkling-bird-ao5precf-pooler.c-2.ap-southeast-1.aws.neon.tech' ||
      url.username !== 'talgov_staging_runtime' || url.pathname !== '/neondb' ||
      url.searchParams.get('sslmode') !== 'verify-full' ||
      url.searchParams.get('channel_binding') !== 'require') throw new Error('target');
  const pool = new Pool(runtimeConnectionConfig(url.toString()));
  pool.on('error', () => {});
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    const identity = (await client.query(`SELECT current_user,session_user,current_database(),
      current_setting('server_version_num') AS server_version_num,
      has_schema_privilege(current_user,'r2_staging','USAGE') AS migration_history_schema_access,
      has_database_privilege(current_user,current_database(),'CREATE') AS database_create,
      has_database_privilege(current_user,current_database(),'TEMP') AS database_temp`)).rows[0];
    const relations = (await client.query(`SELECT n.nspname,c.relname,c.relkind
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='app' OR (n.nspname='public' AND c.relname LIKE 'r2_auth_%')`)).rows;
    const columns = (await client.query(`SELECT n.nspname AS table_schema,c.relname AS table_name,a.attname AS column_name
      FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE a.attnum>0 AND NOT a.attisdropped AND
      (n.nspname='app' OR (n.nspname='public' AND c.relname LIKE 'r2_auth_%'))`)).rows;
    const missingRelations = expected.relations.filter(want => !relations.some(have =>
      have.nspname === want.nspname && have.relname === want.relname && have.relkind === want.relkind))
      .map(r => `${r.nspname}.${r.relname}`);
    const missingColumns = expected.columns.filter(want => !columns.some(have =>
      have.table_schema === want.table_schema && have.table_name === want.table_name && have.column_name === want.column_name))
      .map(r => `${r.table_schema}.${r.table_name}.${r.column_name}`);
    // Resolve privileges/columns and readiness query paths without reading municipal records.
    for (const sql of [
      'SELECT 1 FROM app.published_content WHERE false',
      'SELECT 1 FROM app.staff_auth_throttle WHERE false',
      'SELECT 1 FROM app.staff_auth_audit WHERE false',
      'SELECT 1 FROM public.r2_auth_session WHERE false',
      'SELECT 1 FROM app.staff_session_assurance WHERE false',
      'SELECT 1 FROM app.published_media WHERE false',
      'SELECT original_filename FROM app.media_assets WHERE false',
    ]) await client.query(sql);
    // Check effective permissions without issuing writes, including zero-row writes.
    const requiredPrivileges = [
      ...['r2_auth_user','r2_auth_account','r2_auth_session','r2_auth_verification','r2_auth_rate_limit','r2_auth_two_factor']
        .flatMap(table => ['SELECT','INSERT','UPDATE','DELETE'].map(privilege => [`public.${table}`, privilege])),
      ...['staff_session_assurance','staff_totp_replay','staff_auth_throttle']
        .flatMap(table => ['SELECT','INSERT','UPDATE','DELETE'].map(privilege => [`app.${table}`, privilege])),
      ...['staff_auth_audit','audit_events'].flatMap(table => ['SELECT','INSERT'].map(privilege => [`app.${table}`, privilege])),
      ...['published_content','published_media','public_content','media_assets','content_sources']
        .map(table => [`app.${table}`, 'SELECT']),
      ['app.media_revisions','INSERT'],
    ];
    const deniedPrivileges = [
      ...['staff_auth_audit','audit_events','public_content','media_assets','media_revisions','staff_accounts']
        .map(table => [`app.${table}`, 'DELETE']),
      ...['staff_auth_audit','audit_events','media_revisions'].map(table => [`app.${table}`, 'UPDATE']),
    ];
    const failedPrivilegeChecks = [];
    for (const [table, privilege] of requiredPrivileges) {
      if (!(await client.query('SELECT has_table_privilege(current_user,$1,$2) AS allowed', [table,privilege])).rows[0].allowed)
        failedPrivilegeChecks.push(`${table}: missing ${privilege}`);
    }
    for (const [table, privilege] of deniedPrivileges) {
      if ((await client.query('SELECT has_table_privilege(current_user,$1,$2) AS allowed', [table,privilege])).rows[0].allowed)
        failedPrivilegeChecks.push(`${table}: unexpected ${privilege}`);
    }
    const requiredColumns = [
      ['app.staff_accounts','role','UPDATE'], ['app.staff_accounts','active','UPDATE'],
      ['app.public_content','title','INSERT'], ['app.public_content','publication','UPDATE'],
      ['app.media_assets','original_filename','INSERT'], ['app.media_assets','publication','UPDATE'],
      ['app.media_assets','processing','UPDATE'],
    ];
    for (const [table,column,privilege] of requiredColumns) {
      if (!(await client.query('SELECT has_column_privilege(current_user,$1,$2,$3) AS allowed',[table,column,privilege])).rows[0].allowed)
        failedPrivilegeChecks.push(`${table}.${column}: missing ${privilege}`);
    }
    if (identity.database_create || identity.database_temp || identity.migration_history_schema_access)
      failedPrivilegeChecks.push('runtime unexpectedly has database CREATE/TEMP or migration-history access');
    await client.query('COMMIT');
    const stream = client.connection.stream;
    const result = { identity, tls: { authorized: stream.authorized, protocol: stream.getProtocol(),
      channelBinding: 'required; admitted by application SCRAM-SHA-256-PLUS guard' },
      requiredRelations: expected.relations.length, requiredColumns: expected.columns.length,
      missingRelations, missingColumns, readinessQueryPrivileges: 'pass; zero rows read',
      runtimeRoleGuard: 'pass; no elevated inherited role, schema/relation/database ownership or CREATE access',
      permissionChecks: requiredPrivileges.length + deniedPrivileges.length + requiredColumns.length,
      failedPrivilegeChecks,
      scope: 'read-only object/column presence, runtime guard and targeted effective privileges; no application rows read; not complete type/constraint or migration-history qualification' };
    console.log(JSON.stringify(result, null, 2));
    if (missingRelations.length || missingColumns.length || failedPrivilegeChecks.length) process.exitCode = 1;
  } finally {
    if (client) { await client.query('ROLLBACK').catch(() => {}); client.release(); }
    await pool.end();
  }
}
main().catch(() => { console.error('Read-only staging audit failed; details suppressed.'); process.exitCode = 1; });
