// Deterministic fixture search, not a PostgreSQL full-text engine. Supports literal
// words, quoted phrases, OR and exclusions; no stemming or stop-word dictionaries.
export function mockSearch(params, contract) {
  const allowed = new Set(['q', 'type', 'category', 'page', 'limit', 'sort']);
  if ([...params.keys()].some(key => !allowed.has(key) || params.getAll(key).length !== 1)) return null;
  const q = (params.get('q') ?? '').trim();
  const type = params.get('type') ?? 'all';
  const category = (params.get('category') ?? '').trim();
  const page = Number(params.get('page') ?? 1);
  const limit = Number(params.get('limit') ?? 10);
  const sort = params.get('sort') ?? 'relevance';
  if (!q || q.length > 100 || category.length > 100 || !['all', 'news', 'services', 'pages'].includes(type)
    || !['relevance', 'date'].includes(sort) || !Number.isInteger(page) || page < 1
    || !Number.isInteger(limit) || limit < 1 || limit > 50) return null;
  const groups = [[]];
  for (const token of q.match(/-?"[^"]+"|\S+/g) || []) {
    if (token === 'OR') groups.push([]);
    else groups.at(-1).push({ exclude: token.startsWith('-'), term: token.replace(/^-/, '').replaceAll('"', '').toLowerCase() });
  }
  const rows = ['news', 'services', 'pages'].flatMap(type => {
    const media = contract.paths[`/api/${type}`].get.responses['200'].content['application/json'];
    return (media.example ?? media.schema.example).data.map(item => ({
      id: item.id, slug: item.slug, type, title: item.title || item.name,
      snippet: type === 'pages' ? item.content.slice(0, 200) : item.summary || item.description || item.purpose || item.office_responsible,
      category: type === 'pages' ? 'Page' : item.category || item.office_responsible || 'General',
      created_at: item.created_at,
      text: [item.title, item.name, item.summary, item.description, item.content, item.purpose, item.office_responsible].filter(Boolean).join(' ').toLowerCase(),
    }));
  }).filter(item => groups.some(group => group.length && group.every(({ term, exclude }) => exclude ? !item.text.includes(term) : item.text.includes(term))))
    .map(({ text, ...item }) => ({ ...item, score: groups.flat().filter(token => !token.exclude).reduce((score, { term }) => score + (item.title.toLowerCase().includes(term) ? 2 : text.includes(term) ? 1 : 0), 0) }));
  const byCategory = Object.create(null);
  for (const item of rows) byCategory[item.category] = (byCategory[item.category] || 0) + 1;
  const filtered = rows.filter(item => (type === 'all' || item.type === type) && (!category || item.category === category))
    .sort((a, b) => (sort === 'relevance' ? b.score - a.score : 0) || b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  return {
    data: filtered.slice((page - 1) * limit, page * limit),
    meta: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    facets: {
      byType: Object.fromEntries(['news', 'services', 'pages'].map(type => [type, rows.filter(item => item.type === type).length])),
      byCategory: Object.fromEntries(Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 20)),
    },
  };
}
