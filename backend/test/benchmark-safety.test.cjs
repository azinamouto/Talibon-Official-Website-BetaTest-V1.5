const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

test('benchmark rejects missing or non-staging targets before application bootstrap', () => {
  for (const url of [undefined, 'postgresql://fake:fake@127.0.0.1/test',
    'postgresql://fake:fake@example.invalid/neondb?sslmode=verify-full&channel_binding=require']) {
    const env = Object.fromEntries(['SystemRoot','WINDIR','PATH','TEMP','TMP'].filter(key => process.env[key]).map(key => [key,process.env[key]]));
    if (url) env.DATABASE_URL = url;
    const result = spawnSync(process.execPath, [path.join(__dirname,'../scripts/benchmark-api.cjs')], {
      env, encoding:'utf8', timeout:10000, windowsHide:true,
    });
    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /Benchmark could not complete/);
    assert.ok(!result.stderr.includes('fake'));
    assert.ok(!result.stderr.includes('postgresql:'));
  }
});
