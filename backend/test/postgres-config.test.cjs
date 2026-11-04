const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { Client } = require('pg');
const { connectionConfig, PostgresDatabase, ChannelBoundClient } = require('../dist/database/postgres.js');
const base = 'postgresql://synthetic:synthetic@db.example/test';
const safe = e => e.message === 'Database operation unavailable' && !e.cause;

test('URL security parameters translate to verified TLS and mandatory binding without driver URL overrides', () => {
  for (const scheme of ['postgres', 'postgresql']) for (const sslmode of ['require', 'verify-full']) {
    const config = connectionConfig(base.replace('postgresql', scheme) + `?sslmode=${sslmode}&channel_binding=require`);
    assert.equal(new URL(config.connectionString).search, '');
    assert.equal(config.ssl.rejectUnauthorized, true);
    assert.equal(new Client(config).ssl.rejectUnauthorized, true);
    assert.equal(config.enableChannelBinding, true);
    assert.equal(config.Client, ChannelBoundClient);
    assert.throws(() => config.onConnect(new ChannelBoundClient(config)), safe);
    assert.deepEqual([config.max, config.connectionTimeoutMillis, config.idleTimeoutMillis], [2, 5000, 10000]);
  }
});
test('ambiguous, unknown and weakening URL options fail with secret-safe errors', () => {
  for (const query of ['sslmode=disable', 'sslmode=prefer', 'sslmode=no-verify', 'sslmode=verify-ca',
    'channel_binding=disable', 'channel_binding=prefer', 'channel_binding=', 'channel_binding=REQUIRE',
    'sslmode=require&sslmode=verify-full', 'channel_binding=require&channel_binding=require',
    'ssl=true', 'sslrootcert=secret', 'sslcert=secret', 'sslkey=secret', 'options=secret',
    'host=localhost', 'application_name=secret', 'connect_timeout=0', 'sslmode=require#secret']) {
    assert.throws(() => connectionConfig(base + '?' + query), e => e.message === 'Database operation invalid' && !e.cause);
  }
  for (const url of ['not-a-url', 'https://db.example/test', 'postgres://db.example/']) assert.throws(() => connectionConfig(url));
  assert.throws(() => connectionConfig(base, true));
  assert.throws(() => connectionConfig('postgres://localhost/test?channel_binding=require', true));
  assert.throws(() => connectionConfig('postgres://localhost/test?sslmode=require', true));
  assert.equal(connectionConfig('postgres://localhost/test', true).ssl, false);
});
test('binding guard refuses non-PLUS, unverified TLS, MD5, cleartext and invalid server signatures', () => {
  const config = connectionConfig(base + '?channel_binding=require');
  const c = new ChannelBoundClient(config);
  const errors = [];
  c.connection.on('error', e => errors.push(e));
  c.connection.stream.authorized = true;
  c._handleAuthSASL({ mechanisms: ['SCRAM-SHA-256'] });
  c.connection.stream.authorized = false;
  c._handleAuthSASL({ mechanisms: ['SCRAM-SHA-256-PLUS'] });
  c._handleAuthMD5Password(); c._handleAuthCleartextPassword();
  assert.equal(errors.length, 4); assert.ok(errors.every(safe));
  c.connection.stream.authorized = true;
  c.saslSession = { mechanism: 'SCRAM-SHA-256-PLUS', message: 'SASLResponse', serverSignature: 'expected' };
  c._handleAuthSASLFinal({ data: 'v=d3Jvbmc=' });
  assert.throws(() => config.onConnect(c), safe);
});
test('connection refusal and premature disconnect fail safely without logs or credentials', async () => {
  const server = net.createServer(socket => socket.destroy());
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const port = server.address().port;
  const messages = []; const originals = [console.error, console.warn, console.log];
  console.error = console.warn = console.log = (...args) => messages.push(args.join(' '));
  try {
    for (const open of [true, false]) {
      if (!open) await new Promise(r => server.close(r));
      const db = new PostgresDatabase(connectionConfig(`postgres://synthetic:secret@127.0.0.1:${port}/r2_test`, true));
      try { await assert.rejects(db.transaction(tx => tx.query('SELECT 1')), safe); } finally { await db.close(); }
    }
  } finally { [console.error, console.warn, console.log] = originals; if (server.listening) server.close(); }
  assert.deepEqual(messages, []);
});
