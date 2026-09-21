require('reflect-metadata');
const { ContentService } = require('../dist/api/content/content.service');
const { ListContentDto } = require('../dist/api/content/content.dto');

function setup(result = { data: [], count: 0, error: null }) {
  const query = {};
  for (const key of ['select', 'is', 'eq', 'ilike', 'order', 'range', 'insert', 'update']) query[key] = jest.fn(() => query);
  query.returns = jest.fn(async () => result);
  query.maybeSingle = query.single = jest.fn(async () => result);
  const from = jest.fn(() => query);
  return { service: new ContentService({ getClient: () => ({ from }) }), query, from };
}

test.each([['pages', 'pages', 'published'], ['news', 'news', 'published'], ['services', 'services_cms', 'available']])('public %s reads enforce visibility and stable pagination', async (kind, table, status) => {
  const { service, query, from } = setup({ data: [{ id: 'one' }], count: 31, error: null });
  const result = await service.list(kind, Object.assign(new ListContentDto(), { page: 2, limit: 10, q: '50%_\\' }));
  expect(from).toHaveBeenCalledWith(table);
  expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  expect(query.eq).toHaveBeenCalledWith('status', status);
  expect(query.range).toHaveBeenCalledWith(10, 19);
  expect(query.order.mock.calls).toEqual([['created_at', { ascending: false }], ['id', { ascending: false }]]);
  expect(query.ilike.mock.calls[0][1]).toBe('%50\\%\\_\\\\%');
  expect(result.pagination).toEqual({ page: 2, limit: 10, total: 31, totalPages: 4 });
});
test('staff reads include drafts but not deleted rows; filters compose', async () => {
  const { service, query } = setup();
  await service.list('news', Object.assign(new ListContentDto(), { category: 'UPDATE', slug: 'test' }), true);
  expect(query.eq.mock.calls).toEqual([['slug', 'test'], ['category', 'UPDATE']]);
  expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  await expect(service.list('pages', Object.assign(new ListContentDto(), { category: 'UPDATE' }))).rejects.toMatchObject({ status: 400 });
});
test.each([['23505', 409], ['23503', 400], ['23514', 400], ['XX000', 500]])('database %s maps to sanitized HTTP %s', async (code, status) => {
  const { service } = setup({ data: null, error: { code, message: 'secret database details' } });
  await expect(service.create('pages', {})).rejects.toMatchObject({ status });
  await expect(service.create('pages', {})).rejects.not.toThrow('secret database details');
});
test('missing records and empty patches fail; delete is soft and scoped', async () => {
  const { service, query } = setup({ data: null, error: null });
  await expect(service.get('pages', 'missing')).rejects.toMatchObject({ status: 404 });
  await expect(service.update('pages', 'missing', {})).rejects.toMatchObject({ status: 400 });
  await expect(service.update('pages', 'missing', { title: 'New' })).rejects.toMatchObject({ status: 404 });
  await expect(service.remove('pages', 'missing')).rejects.toMatchObject({ status: 404 });
  expect(query.update).toHaveBeenLastCalledWith({ deleted_at: expect.any(String) });
  expect(query.eq).toHaveBeenCalledWith('id', 'missing');
});
test.each([['pages', 'draft'], ['news', 'draft'], ['services', 'coming-soon']])('%s starts non-public', async (kind, status) => {
  const { service, query } = setup();
  await service.create(kind, { slug: 'new' });
  expect(query.insert).toHaveBeenCalledWith({ status, slug: 'new' });
});
