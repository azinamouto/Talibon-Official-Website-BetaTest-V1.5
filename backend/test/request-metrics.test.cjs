const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { Logger } = require('@nestjs/common');
const { requestMetrics } = require('../dist/security/request-metrics.middleware');

test('metrics record errors/latency once using route templates and omit private input', () => {
  const events = [];
  const original = Logger.prototype.log;
  Logger.prototype.log = message => events.push(JSON.parse(message));
  try {
    const response = Object.assign(new EventEmitter(), { statusCode: 500, writableFinished: true });
    let continued = false;
    requestMetrics({
      requestId: 'request-1', method: 'GET', url: '/api/private-secret?token=secret',
      headers: { authorization: 'Bearer secret' }, body: { citizen: 'secret' },
      route: { path: '/api/:id' },
    }, response, () => { continued = true; });
    response.emit('finish');
    response.emit('close');
    assert.equal(continued, true);
    assert.equal(events.length, 1);
    assert.equal(events[0].status, 500);
    assert.equal(events[0].route, '/api/:id');
    assert.ok(events[0].durationMs >= 0);
    assert.doesNotMatch(JSON.stringify(events), /secret/);
    const aborted = Object.assign(new EventEmitter(), { statusCode: 200, writableFinished: false });
    requestMetrics({ method: 'GET' }, aborted, () => {});
    aborted.emit('close');
    assert.equal(events[1].status, 499);
    assert.equal(events[1].route, 'unmatched');
  } finally { Logger.prototype.log = original; }
});
