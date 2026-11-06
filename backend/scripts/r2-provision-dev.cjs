#!/usr/bin/env node
// TalGov R2 Phase C — Development branch provisioning
// Applies auth and media migrations to neondb on br-bitter-fire-aouffr8u ONLY.
// Uses r2-neon-target.cjs to verify the exact branch before any write.
// Requires: .env.neon-qualification (migration URL)
// Run from repo root: node backend/scripts/r2-provision-dev.cjs [--apply]

const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { Pool } = require('pg');
const dotenv = require('dotenv');

const { verifyTarget, neonConfig } = require('./r2-neon-target.cjs');

const AUTH_PROVIDER = path.join(__dirname, '../database/auth/001_provider.sql');
const AUTH_STAFF = path.join(__dirname, '../database/auth/002_staff_policy.sql');
const MEDIA_POLICY = path.join(__dirname, '../database/media/001_media_policy.sql');

function readSql(p) { return fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n'); }
function digest(s) { return createHash('sha256').update(s).digest('hex'); }

async function main() {
  const dryRun = !process.argv.includes('--apply');
  const mode = dryRun ? 'DRY RUN' : 'APPLY';
  console.log(`\n=== TalGov R2 Phase C Provisioning (${mode}) ===\n`);

  // 1: Verify exact Neon target
  console.log('1. Verifying Neon development branch...');
  const target = verifyTarget();
  console.log(`   ✓ ${target.name} (${target.branch}) on ${target.project}`);

  // 2: Connect with migration credentials
  const root = path.resolve(__dirname, '../..');
  const qualEnv = dotenv.parse(fs.readFileSync(path.join(root, '.env.neon-qualification')));
  const pool = new Pool(neonConfig(qualEnv.R2_MIGRATION_DATABASE_URL));
  const client = await pool.connect();

  try {
    // 3: Pre-flight check
    console.log('\n2. Pre-flight inventory on neondb...');
    const check = async (s, t) => (await client.query(
      'SELECT 1 FROM pg_tables WHERE schemaname=$1 AND tablename=$2', [s, t])).rowCount > 0;
    const checkCol = async (s, t, c) => (await client.query(
      `SELECT 1 FROM information_schema.columns WHERE table_schema=$1 AND table_name=$2 AND column_name=$3`, [s, t, c])).rowCount > 0;

    const hasAuth = await check('public', 'r2_auth_user');
    const hasStaffPolicy = await check('app', 'staff_session_assurance');
    const hasMediaThrottle = await check('app', 'media_throttle');
    const hasFilenameCol = await checkCol('app', 'media_assets', 'original_filename');

    console.log(`   Auth provider (r2_auth_user):      ${hasAuth ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`   Staff policy (staff_session_assur): ${hasStaffPolicy ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`   Media throttle:                     ${hasMediaThrottle ? '✓ EXISTS' : '✗ MISSING'}`);
    console.log(`   original_filename column:           ${hasFilenameCol ? '✓ EXISTS' : '✗ MISSING'}`);

    let applied = 0, skipped = 0;

    // 4a: Auth provider tables
    console.log('\n3. Migrations...');
    if (!hasAuth) {
      const sql = readSql(AUTH_PROVIDER);
      const hash = digest(sql);
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout='30s'");
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query('SELECT pg_advisory_xact_lock(72002)');
      await client.query(`CREATE TABLE IF NOT EXISTS public.r2_auth_migrations(
        version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
      await client.query('REVOKE ALL ON public.r2_auth_migrations FROM PUBLIC');
      const prior = (await client.query("SELECT checksum FROM public.r2_auth_migrations WHERE version='001_provider'")).rows[0];
      if (prior && prior.checksum !== hash) throw new Error('Auth provider checksum mismatch');
      if (!prior) {
        await client.query(sql);
        await client.query("INSERT INTO public.r2_auth_migrations VALUES('001_provider',$1)", [hash]);
      }
      await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
      console.log(`   ${dryRun ? '[dry-run]' : '[applied]'} auth/001_provider.sql — 6 tables, 5 indexes (${hash.slice(0,12)})`);
      applied++;
    } else { console.log('   [skip] auth/001_provider.sql — already exists'); skipped++; }

    // 4b: Staff auth policy (depends on auth provider)
    if (!hasStaffPolicy) {
      // Verify dependency
      const authNow = await check('public', 'r2_auth_user');
      if (!authNow && dryRun) {
        console.log('   [skip] auth/002_staff_policy.sql — dependency missing in dry-run');
        skipped++;
      } else if (!authNow) {
        throw new Error('Cannot apply staff policy: r2_auth_user does not exist after 001_provider');
      } else {
        const sql = readSql(AUTH_STAFF);
        const hash = digest(sql);
        await client.query('BEGIN');
        await client.query("SET LOCAL statement_timeout='30s'");
        await client.query("SET LOCAL lock_timeout='5s'");
        await client.query('SELECT pg_advisory_xact_lock(72003)');
        const prior = (await client.query("SELECT checksum FROM public.r2_auth_migrations WHERE version='002_staff_policy'")).rows[0];
        if (prior && prior.checksum !== hash) throw new Error('Staff policy checksum mismatch');
        if (!prior) {
          await client.query(sql);
          await client.query("INSERT INTO public.r2_auth_migrations VALUES('002_staff_policy',$1)", [hash]);
        }
        await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
        console.log(`   ${dryRun ? '[dry-run]' : '[applied]'} auth/002_staff_policy.sql — 4 tables, 2 indexes, 1 trigger (${hash.slice(0,12)})`);
        applied++;
      }
    } else { console.log('   [skip] auth/002_staff_policy.sql — already exists'); skipped++; }

    // 4c: Media policy
    if (!hasMediaThrottle || !hasFilenameCol) {
      const sql = readSql(MEDIA_POLICY);
      const hash = digest(sql);
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout='30s'");
      await client.query("SET LOCAL lock_timeout='5s'");
      await client.query('SELECT pg_advisory_xact_lock(72004)');
      await client.query(`CREATE TABLE IF NOT EXISTS public.r2_media_migrations(
        version text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
      await client.query('REVOKE ALL ON public.r2_media_migrations FROM PUBLIC');
      const prior = (await client.query("SELECT checksum FROM public.r2_media_migrations WHERE version='001'")).rows[0];
      if (prior && prior.checksum !== hash) throw new Error('Media policy checksum mismatch');
      if (!prior) {
        await client.query(sql);
        await client.query("INSERT INTO public.r2_media_migrations VALUES('001',$1)", [hash]);
      }
      await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
      console.log(`   ${dryRun ? '[dry-run]' : '[applied]'} media/001_media_policy.sql — 1 table, 1 column, grants (${hash.slice(0,12)})`);
      applied++;
    } else { console.log('   [skip] media/001_media_policy.sql — already exists'); skipped++; }

    // 5: Post-apply verification
    console.log('\n4. Post-apply inventory...');
    const tables = await client.query(`
      SELECT schemaname||'.'||tablename AS t FROM pg_tables
      WHERE schemaname IN ('app','public')
      AND tablename NOT LIKE 'r2_q_%' AND tablename NOT LIKE 'r2_%_migrations'
      AND tablename NOT LIKE 'r2_source%' AND tablename NOT LIKE 'r2_upgrade%'
      AND tablename NOT LIKE 'r2_restore%'
      ORDER BY 1`);
    console.log(`   Tables: ${tables.rowCount}`);
    for (const r of tables.rows) console.log(`     ${r.t}`);

    const views = await client.query(`SELECT schemaname||'.'||viewname AS v FROM pg_views WHERE schemaname='app' ORDER BY 1`);
    console.log(`   Views: ${views.rowCount}`);

    const indexes = await client.query(`
      SELECT count(*) AS c FROM pg_indexes
      WHERE schemaname IN ('app','public')
      AND tablename NOT LIKE 'r2_q_%'`);
    console.log(`   Indexes: ${indexes.rows[0].c}`);

    const triggers = await client.query(`
      SELECT trigger_name, event_object_schema||'.'||event_object_table AS tbl
      FROM information_schema.triggers
      WHERE trigger_schema IN ('app','public')
      ORDER BY 1`);
    console.log(`   Triggers: ${triggers.rowCount}`);
    for (const r of triggers.rows) console.log(`     ${r.trigger_name} ON ${r.tbl}`);

    // Migration ledgers
    const ledgers = await client.query(`
      SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'r2_%_migrations' ORDER BY 1`);
    for (const l of ledgers.rows) {
      const rows = await client.query(`SELECT version, checksum FROM public."${l.tablename}" ORDER BY version`);
      console.log(`   Ledger ${l.tablename}: ${rows.rowCount} entries`);
      for (const r of rows.rows) console.log(`     ${r.version}: ${r.checksum.slice(0,16)}...`);
    }

    console.log(`\n=== Result: ${applied} applied, ${skipped} skipped (${mode}) ===`);
    console.log(JSON.stringify({ mode, applied, skipped, tables: tables.rowCount, views: views.rowCount, triggers: triggers.rowCount }));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Phase C failed:', err.message);
  process.exitCode = 1;
});

