const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { PostgresDatabase } = require('../dist/database/postgres');
const { classifyFailure } = require('../dist/security/failure-diagnostics');

function fixture(fail = () => false) {
  const db = new PostgresDatabase({});
  const queries = [], released = [];
  const client = new EventEmitter();
  client.query = async (sql, values) => {
    queries.push({ sql, values });
    if (fail(sql)) throw Object.assign(new Error('sensitive provider detail'), { code: '08006' });
    return { rows: [{ value: 1 }] };
  };
  client.release = discard => released.push(discard);
  db.pool.connect = async () => client;
  return { db, queries, released, client };
}

test('transaction setup uses one exchange, preserves all limits and parameterized work', async () => {
  for (const readOnly of [false, true]) {
    const f = fixture();
    try {
      const result = await f.db.transaction(tx => tx.query('SELECT $1 AS value', [1]), readOnly);
      assert.deepEqual(result, [{ value: 1 }]);
      assert.equal(f.queries.length, 3);
      assert.deepEqual(f.queries[0].sql.split('; '), [
        readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN',
        "SET LOCAL statement_timeout = '5s'", "SET LOCAL lock_timeout = '2s'",
        "SET LOCAL idle_in_transaction_session_timeout = '5s'",
        'SET LOCAL transaction_timeout = 0', "SET LOCAL transaction_timeout = '10s'",
      ]);
      assert.deepEqual(f.queries[1].values, [1]);
      assert.equal(f.queries[2].sql, 'COMMIT');
      assert.deepEqual(f.released, [false]);
      assert.equal(f.client.listenerCount('error'), 0);
    } finally { await f.db.close(); }
  }
});

test('setup failure never invokes work; failed rollback discards connection', async () => {
  const f = fixture(() => true);
  let work = 0;
  try {
    await assert.rejects(f.db.transaction(async () => { work++; }), e => e.message === 'Database operation unavailable' &&
      classifyFailure(e).phase === 'transaction_setup' && classifyFailure(e).transaction_outcome === 'unknown');
    assert.equal(work, 0);
    assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
    assert.deepEqual(f.released, [true]);
  } finally { await f.db.close(); }
});

test('ambiguous commit is never retried, including read-only callbacks', async () => {
  for (const readOnly of [false, true]) {
    const f = fixture(sql => sql === 'COMMIT');
    let calls = 0;
    try {
      await assert.rejects(f.db.transaction(async tx => { calls++; return tx.query('SELECT 1'); }, readOnly),
        e => e.message === 'Database operation unavailable' && classifyFailure(e).phase === 'commit' && classifyFailure(e).transaction_outcome === 'unknown');
      assert.equal(calls, 1);
      assert.equal(f.queries.filter(q => q.sql === 'COMMIT').length, 1);
      assert.equal(f.queries.at(-1).sql, 'ROLLBACK');
    } finally { await f.db.close(); }
  }
});

test('checkout, query and callback failures preserve original phase and transaction outcome', async () => {
  for (const stage of ['connect', 'query', 'work']) {
    const f = fixture(sql => stage === 'query' && sql === 'SELECT 1');
    if (stage === 'connect') f.db.pool.connect = async () => { throw Object.assign(Error('private'), { code: 'ETIMEDOUT' }); };
    try {
      await assert.rejects(f.db.transaction(async tx => {
        if (stage === 'work') throw new TypeError('private callback');
        return tx.query('SELECT 1');
      }), e => {
        const details = classifyFailure(e);
        assert.equal(e.message, 'Database operation unavailable');
        assert.equal(details.phase, stage);
        assert.equal(details.reason, stage === 'connect' ? 'connection_timeout' : stage === 'query' ? 'connection_failure' : 'unexpected_exception');
        assert.equal(details.transaction_outcome, stage === 'connect' ? 'not_started' : 'rollback_confirmed');
        return true;
      });
      assert.equal(f.queries.filter(q => q.sql === 'ROLLBACK').length, stage === 'connect' ? 0 : 1);
      assert.equal(f.queries.filter(q => q.sql === 'COMMIT').length, 0);
    } finally { await f.db.close(); }
  }
});
