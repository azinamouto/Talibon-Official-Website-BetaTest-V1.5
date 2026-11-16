// Measurements only on the identity-verified disposable cluster created by the existing harness.
require('reflect-metadata');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { randomUUID, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');
const { fixtureConfig, verifyFixture } = require('./local-staging-fixture.cjs');
const { migrations } = require('../scripts/staging/runner.cjs');
const { PostgresDatabase, connectionConfig, runtimeConnectionConfig } = require('../dist/database/postgres');
const { PublicContentService } = require('../dist/database/public-content.service');
const { MediaService } = require('../dist/api/media/media.service');
const { MediaRepository } = require('../dist/database/media.repository');
const { NestFactory } = require('@nestjs/core');
const { configureApp } = require('../dist/configure-app');
const runtime = require('../dist/authentication/runtime');
const percentile = (samples, p) => [...samples].sort((a, b) => a - b)[Math.ceil(samples.length * p) - 1];
const summarize = samples => ({ samples: samples.length, p50Ms: percentile(samples, .5), p95Ms: percentile(samples, .95), minMs: Math.min(...samples), maxMs: Math.max(...samples) });

test('measure local public API, restricted queries and CMS reads without hosted resources', async () => {
  const label = process.env.TALGOV_PERF_LABEL || 'baseline';
  assert.match(label, /^(baseline|after)$/);
  const fixture = fixtureConfig(process.env.R2_STAGING_TEST_FIXTURE);
  const owner = new Pool(connectionConfig(fixture.url.toString(), true));
  let db, app;
  try {
    await verifyFixture(owner, fixture); // Must precede every local schema/data write.
    await owner.query('ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC');
    for (const migration of migrations()) await owner.query(migration.sql);
    await owner.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
    await owner.query('CREATE ROLE perf_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS; GRANT talgov_runtime TO perf_runtime');
    const source = randomUUID(), category = randomUUID(), subject = randomUUID(), session = randomUUID();
    await owner.query("INSERT INTO app.content_sources(id,reference,owner,sha256,approved,reviewed_at) VALUES($1,'Synthetic performance fixture','Local benchmark only',$2,true,now())",
      [source, createHash('sha256').update('synthetic-performance-fixture').digest('hex')]);
    await owner.query(`INSERT INTO app.public_content(kind,legacy_id,slug,title,body,source_id,publication,published_at)
      SELECT 'news','synthetic-'||n,'synthetic-'||n,'Synthetic benchmark article '||n,
        jsonb_build_object('category','ARTICLE','summary','Synthetic benchmark summary','content',repeat('Synthetic text. ',100)),
        $1,CASE WHEN n%5=0 THEN 'draft' ELSE 'published' END,
        CASE WHEN n%5=0 THEN NULL ELSE now()-n*interval '1 minute' END FROM generate_series(1,5000) n`, [source]);
    await owner.query('ANALYZE app.public_content; ANALYZE app.content_sources');
    await owner.query('INSERT INTO r2_auth_user(id,name,email,"emailVerified","twoFactorEnabled","createdAt","updatedAt") VALUES($1,$2,$3,true,true,now(),now())',
      [subject, 'Synthetic benchmark editor', subject + '@example.invalid']);
    await owner.query('INSERT INTO r2_auth_session(id,"userId",token,"expiresAt","createdAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 hour\',now(),now())', [session, subject, randomUUID()]);
    await owner.query('INSERT INTO app.staff_session_assurance(session_id) VALUES($1)', [session]);
    const { rows: [account] } = await owner.query("INSERT INTO app.staff_accounts(provider,subject,role,active) VALUES('better-auth',$1,'editor',true) RETURNING id", [subject]);
    const actor = { ...account, subject, sessionId: session, role: 'editor', provider: 'better-auth', sessionVerified: true, assurance: 'mfa' };
    await owner.query("INSERT INTO app.media_categories(id,kind,slug,title,approved) VALUES($1,'photo','synthetic','Synthetic benchmark category',true)", [category]);
    await owner.query(`INSERT INTO app.media_assets(kind,category_id,source_id,title,description,alt_text,object_key,mime,bytes,sha256,created_by,updated_by,processing)
      SELECT 'photo',$1,$2,'Synthetic benchmark media '||n,'Synthetic description','Synthetic image',
        'synthetic-performance/'||n,'image/png',100,$3,$4,$4,'ready' FROM generate_series(1,100) n`, [category, source, 'a'.repeat(64), actor.id]);
    const runtimeUrl = new URL(fixture.url); runtimeUrl.username = 'perf_runtime';
    db = new PostgresDatabase(runtimeConnectionConfig(runtimeUrl.toString(), true));
    const queries = [];
    const measured = { close: async () => {}, transaction: (work, readOnly) => db.transaction(tx => work({ query: async (sql, values) => {
      const started = performance.now();
      const rows = await tx.query(sql, values);
      queries.push({ durationMs: performance.now() - started, resultBytes: Buffer.byteLength(JSON.stringify(rows)), operation: sql.trim().split(/\s+/)[0] });
      return rows;
    } }), readOnly) };
    const publicContent = new PublicContentService(); publicContent.configure(measured);
    const serviceSamples = [];
    for (let n = 0; n < 5; n++) await publicContent.list('news', 1, 20);
    queries.length = 0;
    for (let n = 0; n < 40; n++) {
      const started = performance.now(); const result = await publicContent.list('news', 1, 20);
      assert.equal(result.data.length, 20); assert.equal(result.pagination.total, 4000);
      serviceSamples.push(performance.now() - started);
    }
    const serviceQueryCount = queries.length;
    const queryResultBytes = queries.reduce((sum, item) => sum + item.resultBytes, 0) / 40;
    const queryLatency = summarize(queries.map(item => item.durationMs));
    const { AppModule } = require('../dist/app.module');
    runtime.staffAuthentication = () => ({ verify: async headers => headers.get('cookie') === 'synthetic=editor' ? actor : null, handle: (_req, _res, next) => next() });
    app = await NestFactory.create(AppModule, { logger: false, bodyParser: false });
    app.get(PublicContentService).configure(measured);
    app.get(MediaService).configure(new MediaRepository(db), { verifyPrivate: async () => {}, read: async () => { throw new Error('Object delivery is outside this benchmark'); } });
    configureApp(app); await app.listen(0, '127.0.0.1');
    const origin = await app.getUrl();
    const httpResults = [];
    for (const [endpoint, cookie] of [['/api/news?limit=20', undefined], ['/api/admin/media?page=1', 'synthetic=editor']]) {
      const times = [], sizes = [];
      let next = 0;
      await Promise.all(Array.from({ length: 4 }, async () => {
        while (next++ < 40) {
          const started = performance.now();
          const response = await fetch(origin + endpoint, { headers: cookie ? { cookie } : {} });
          const body = await response.text();
          assert.equal(response.status, 200); assert.ok(JSON.parse(body).data.length > 0);
          times.push(performance.now() - started); sizes.push(Buffer.byteLength(body));
        }
      }));
      httpResults.push({ endpoint, concurrency: 4, ...summarize(times), responseBytes: sizes[0] });
    }
    const plans = [];
    for (const [name, sql] of [
      ['published-news-page', "SELECT id,kind,slug,title,body,published_at FROM app.published_content WHERE kind='news' ORDER BY published_at DESC,id LIMIT 20"],
      ['published-news-count', "SELECT count(*) FROM app.published_content WHERE kind='news'"],
      ['staff-media-page', 'SELECT * FROM app.media_assets WHERE deleted_at IS NULL ORDER BY created_at DESC,id LIMIT 51'],
    ]) {
      plans.push({ name, plan: (await owner.query('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql)).rows[0]['QUERY PLAN'] });
    }
    const report = { label, measuredAt: new Date().toISOString(), scope: 'identity-verified disposable PostgreSQL; original migrations; synthetic data; no hosted resources. CMS session verification injected; repository authorization retained; no Better Auth/mail/storage latency claim',
      environment: { node: process.version, postgres: (await owner.query('SHOW server_version')).rows[0].server_version },
      fixture: { newsRows: 5000, publishedNewsRows: 4000, mediaRows: 100, poolMax: 2 },
      publicService: { ...summarize(serviceSamples), businessQueriesPerRequest: serviceQueryCount / 40, queryResultBytesPerRequest: queryResultBytes }, queryLatency, httpResults, plans };
    const output = path.resolve(__dirname, '../../docs/r2/evidence/performance', `${label}-database.json`);
    fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ output, publicService: report.publicService, httpResults }));
  } finally { await app?.close(); await db?.close(); await owner.end(); }
});
