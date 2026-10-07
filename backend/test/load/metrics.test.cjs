const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('./run.cjs');
// Arithmetic-only checks; these samples are never sent to an API or database.
const samples = Array.from({ length: 20 }, () => ({ ms: 10, ok: true, status: 200, hasData: true }));
test('load gate rejects slow responses, errors, dropped arrivals and insufficient evidence', () => {
  assert.equal(summarize(samples).pass, true);
  assert.equal(summarize(samples.map(s => ({ ...s, ms: 200 }))).pass, false);
  assert.equal(summarize([...samples.slice(1), { ms: 1, status: 429, ok: false }]).pass, false);
  assert.equal(summarize(samples, 1).pass, false);
  assert.equal(summarize(samples.slice(1)).pass, false);
  assert.equal(summarize([]).pass, false);
  assert.equal(summarize(samples.map(s => ({ ...s, hasData: false }))).pass, false);
});
