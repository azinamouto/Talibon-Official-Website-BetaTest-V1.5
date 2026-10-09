import React, { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PublicShell, PublicState, PublicPagination, pageNumber } from '../components/PublicContent';
import { usePublicResource } from '../hooks/usePublicResource';
import { searchPublic, searchLink, SearchQuery } from '../services/publicApi';

const types = ['all', 'news', 'services', 'pages'] as const;
const labels = { all: 'All content', news: 'News', services: 'Services', pages: 'Pages' };
const fieldClass = 'ui-focus w-full rounded-lg border border-brand-border bg-brand-surface p-3';

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const q = (params.get('q') || '').trim();
  const type = types.find(value => value === params.get('type')) || 'all';
  const category = (params.get('category') || '').trim();
  const sort = params.get('sort') === 'date' ? 'date' : 'relevance';
  const page = pageNumber(params.get('page'));
  const rawLimit = Number(params.get('limit') ?? 10);
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 && rawLimit <= 50 ? rawLimit : 10;
  const query: SearchQuery = { q, type, category, sort, page, limit };
  const update = (changes: Partial<SearchQuery>) => {
    const next = { ...query, page: 1, ...changes };
    setParams(new URLSearchParams(Object.entries(next).filter(([, value]) => value !== '').map(([key, value]) => [key, String(value)])));
  };
  const valid = q.length > 0 && q.length <= 100 && category.length <= 100;

  return <PublicShell title="Search Talibon">
    <p className="text-brand-muted">Find municipal news, services and public information.</p>
    <form key={q} role="search" className="flex flex-col sm:flex-row items-end gap-3" onSubmit={event => {
      event.preventDefault();
      update({ q: String(new FormData(event.currentTarget).get('q') || '').trim() });
    }}>
      <label className="flex-1 w-full">Search the site
        <input className={fieldClass} name="q" type="search" maxLength={100} defaultValue={q} placeholder="e.g. business permit" />
      </label>
      <button className="ui-focus rounded-lg bg-brand-primary text-white px-6 py-3">Search</button>
    </form>
    {!valid ? <p role={q.length > 100 || category.length > 100 ? 'alert' : 'status'} className="civic-card p-6">
      {q.length > 100 || category.length > 100 ? 'Search terms and categories must be 100 characters or fewer.' : 'Enter a search term to find news, services and pages.'}
    </p> : <SearchResults query={query} update={update} />}
  </PublicShell>;
}

function SearchResults({ query, update }: { query: SearchQuery; update: (changes: Partial<SearchQuery>) => void }) {
  const { q, type, category, sort, page, limit } = query;
  const resource = usePublicResource(useCallback((signal: AbortSignal) => searchPublic({ q, type, category, sort, page, limit }, signal), [q, type, category, sort, page, limit]));
  const categories = Object.keys(resource.data?.facets.byCategory || {}).sort();
  if (category && !categories.includes(category)) categories.unshift(category);
  return <>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <label>Content type<select className={fieldClass} value={type} onChange={event => update({ type: event.target.value as SearchQuery['type'], category: '' })}>
        {types.map(value => <option key={value} value={value}>{labels[value]}{resource.data && value !== 'all' ? ` (${resource.data.facets.byType[value]})` : ''}</option>)}
      </select></label>
      <label>Category or department<select className={fieldClass} value={category} onChange={event => update({ category: event.target.value })}>
        <option value="">All categories</option>
        {categories.map(value => <option key={value} value={value}>{value}{resource.data?.facets.byCategory[value] !== undefined ? ` (${resource.data.facets.byCategory[value]})` : ''}</option>)}
      </select></label>
      <label>Sort by<select className={fieldClass} value={sort} onChange={event => update({ sort: event.target.value as SearchQuery['sort'] })}>
        <option value="relevance">Relevance</option><option value="date">Newest first</option>
      </select></label>
      <label>Results per page<select className={fieldClass} value={limit} onChange={event => update({ limit: Number(event.target.value) })}>
        {[...new Set([10, 20, 50, limit || 10])].sort((a, b) => a - b).map(value => <option key={value}>{value}</option>)}
      </select></label>
    </div>
    <p className="text-sm text-brand-muted">Filter counts show all matches for your search term before filters are applied.</p>
    {(type !== 'all' || category) && <button className="ui-focus text-brand-primary underline" onClick={() => update({ type: 'all', category: '' })}>Clear filters</button>}
    <section aria-label="Search results" aria-busy={resource.loading} className="space-y-5">
      <PublicState {...resource} />
      {!resource.loading && !resource.error && resource.data && <>
        <p role="status">{resource.data.meta.total} results for “{q}”</p>
        {resource.data.data.length === 0 ? <div className="civic-card p-6 space-y-3">
          <p>{resource.data.meta.total > 0 ? 'There are no results on this page.' : 'No results found. Try another search term or clear the filters.'}</p>
          {(page || 1) > 1 && <button className="ui-focus text-brand-primary underline" onClick={() => update({ page: 1 })}>Go to first page</button>}
        </div> : <ul className="space-y-4">
          {resource.data.data.map(item => <li key={`${item.type}-${item.id}`} className="civic-card p-6 space-y-2">
            <p className="text-sm text-brand-muted">{labels[item.type]} · {item.category}</p>
            <h2 className="text-xl font-bold"><Link className="ui-focus text-brand-primary underline" to={searchLink(item)}>{item.title}</Link></h2>
            <p className="text-brand-muted whitespace-pre-wrap">{item.snippet}</p>
          </li>)}
        </ul>}
        {resource.data.meta.totalPages > 0 && <PublicPagination pagination={resource.data.meta} onPage={page => update({ page })} />}
      </>}
    </section>
  </>;
}
