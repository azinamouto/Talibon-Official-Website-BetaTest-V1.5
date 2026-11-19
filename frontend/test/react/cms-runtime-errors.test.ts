import { afterEach, expect, it, vi } from 'vitest';
import { staffResponseError, StaffRequestError } from '../../src/lib/staffErrors';
import { isReadyMedia, uploadPrivateMedia } from '../../src/lib/mediaUpload';
import { staffRequest } from '../../src/contexts/StaffAuthContext';
const requestId = '99999999-9999-4999-8999-999999999999';
const ready = { id: '11111111-1111-4111-8111-111111111111', version: 2, processing: 'ready', publication: 'draft', kind: 'photo' };
afterEach(() => vi.unstubAllGlobals());
it('distinguishes a dependency outage and retains a safe request reference', () => {
  const error = staffResponseError(503, { failureCode: 'dependency_unavailable', requestId, message: 'private provider password' });
  expect(error.message).toContain('administrator attention');
  expect(error.message).toContain(requestId);
  expect(error.message).not.toContain('private provider');
  expect(error.requestId).toBe(requestId);
  expect(staffResponseError(503, { failureCode: 'operation_unconfirmed' }).message).toContain('same submission');
  expect(staffResponseError(503, { requestId: 'unsafe reference <script>' }).message).not.toContain('<script>');
});
it('normalizes lost responses and network failures into recoverable staff errors', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce({ ok: true, json: async () => { throw new SyntaxError('Unexpected end'); } }));
  for (let attempt = 0; attempt < 2; attempt++) await expect(staffRequest('/api/admin/content/news/publish', {})).rejects.toMatchObject({ status: 503 });
});
it.each([{ ...ready, id: 'undefined' }, { ...ready, id: 'placeholder' }, { ...ready, version: undefined },
  { ...ready, version: 0 }, { ...ready, version: 1.5 }, { ...ready, processing: 'pending' }])('rejects malformed ready metadata before it can form a UUID attachment request: %j', value => {
  expect(isReadyMedia(value)).toBe(false);
  expect(isReadyMedia(ready)).toBe(true);
});
it('accepts UUID versions supported by the existing media route contract', () => {
  expect(isReadyMedia({ ...ready, id: '11111111-1111-5111-8111-111111111111' })).toBe(true);
});
it('keeps the original upload identity when the server sends malformed success metadata', async () => {
  const sent: unknown[] = [];
  vi.stubGlobal('XMLHttpRequest', class {
    upload = {}; status = 201; responseText = JSON.stringify({ ...ready, id: 'placeholder' });
    onload?: () => void;
    open() {} setRequestHeader() {}
    send(body: string) { sent.push(JSON.parse(body)); this.onload?.(); }
  });
  const file = new File(['fixture'], 'photo.png', { type: 'image/png' });
  const metadata = { title: 'Fixture', description: '', altText: 'Fixture', filename: 'photo.png' };
  for (let attempt = 0; attempt < 2; attempt++) await expect(uploadPrivateMedia(file, metadata, requestId, () => {})).rejects.toBeInstanceOf(StaffRequestError);
  expect(sent).toHaveLength(2);
  expect(sent[0]).toEqual(sent[1]);
  expect(sent[0]).toMatchObject({ uploadId: requestId });
});
