import React, { useCallback } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { listPublic, PublicNews } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import { PublicShell, PublicState, PublicPagination, pageNumber } from '../components/PublicContent';

const categories: Record<string, string> = { articles: 'ARTICLE', updates: 'UPDATE', announcements: 'ANNOUNCEMENT', advisories: 'ANNOUNCEMENT', notices: 'ANNOUNCEMENT' };
export default function NewsCategoryPage() {
  const { category } = useParams();
  const [params, setParams] = useSearchParams();
  const page = pageNumber(params.get('page'));
  const q = (params.get('q') || '').slice(0, 100).trim();
  const filter = category ? categories[category] : '';
  const resource = usePublicResource(useCallback((signal: AbortSignal) =>
    category && !filter ? Promise.resolve({ data: [], pagination: { page, limit: 12, total: 0, totalPages: 0 } }) :
      listPublic<PublicNews>('news', { page, limit: 12, q, category: filter || '' }, signal), [page, q, filter, category]));
  return <PublicShell title="News & Updates">
    <nav aria-label="News categories" className="flex flex-wrap gap-4 text-brand-primary">
      <Link to="/news">All news</Link><Link to="/news/articles">Articles</Link><Link to="/news/updates">Updates</Link><Link to="/news/announcements">Announcements</Link>
    </nav>
    <form key={`${category}-${q}`} role="search" onSubmit={event => {
      event.preventDefault();
      const term = String(new FormData(event.currentTarget).get('q') || '').trim();
      setParams(term ? { q: term } : {});
    }} className="flex flex-col sm:flex-row gap-3">
      <label htmlFor="news-query" className="sr-only">Search news</label>
      <input id="news-query" name="q" type="search" maxLength={100} defaultValue={q} placeholder="Search news" className="min-w-0 flex-1 border rounded-lg p-3 bg-brand-surface" />
      <button className="rounded-lg px-5 py-3 bg-brand-primary text-white">Search news</button>
    </form>
    <PublicState {...resource} />
    {!resource.loading && !resource.error && resource.data && <>
      {resource.data.data.length === 0 ? <p role="status" className="civic-card p-8">No news found. Try another search or category.</p> :
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resource.data.data.map(item => <article key={item.id} className="civic-card overflow-hidden">
            {item.image_url && /^https?:\/\//i.test(item.image_url) && <img src={item.image_url} alt="" loading="lazy" className="w-full h-48 object-cover" />}
            <div className="p-6 space-y-3">
              <p className="text-sm text-brand-muted">{item.category} · {item.date}</p>
              <h2 className="text-xl font-bold"><Link className="text-brand-primary" to={`/news/view/${encodeURIComponent(item.id)}`}>{item.title}</Link></h2>
              <p className="text-brand-muted line-clamp-3">{item.summary}</p>
            </div>
          </article>)}
        </div>}
      <PublicPagination pagination={resource.data.pagination} onPage={page => setParams({ ...(q ? { q } : {}), page: String(page) })} />
    </>}
  </PublicShell>;
}
