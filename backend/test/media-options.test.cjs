const { test } = require('node:test');
const assert = require('node:assert/strict');
const { MediaService } = require('../dist/api/media/media.service');
const { DatabaseError } = require('../dist/database/postgres');

test('content source choices do not initialize storage and retain repository authorization', async () => {
  const previous = process.env.AWS_ENDPOINT_URL_S3;
  process.env.AWS_ENDPOINT_URL_S3 = 'http://invalid.invalid';
  try {
    const service = new MediaService();
    const actor = { id: 'unit-test-editor', role: 'editor' };
    const choices = { categories: [], sources: [] };
    let denied = false;
    service.configure({ options: async received => {
      assert.equal(received, actor);
      if (denied) throw new DatabaseError('forbidden');
      return choices;
    } }, undefined);
    assert.equal(await service.options(actor), choices);
    denied = true;
    await assert.rejects(service.options(actor), error => error.getStatus() === 403);
    // File operations must still reject invalid private-storage configuration.
    await assert.rejects(service.list(actor, 1), error => error.getStatus() === 503);
  } finally {
    if (previous === undefined) delete process.env.AWS_ENDPOINT_URL_S3;
    else process.env.AWS_ENDPOINT_URL_S3 = previous;
  }
});
