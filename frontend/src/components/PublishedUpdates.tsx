import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { listPublic, type PublicNews } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import { PublicState, PublicPagination } from './PublicContent';
export default function PublishedUpdates() {
  const [page,setPage]=useState(1);
  const resource=usePublicResource(useCallback((signal:AbortSignal)=>listPublic<PublicNews>('news',{page,limit:12,category:'UPDATE'},signal),[page]));
  return <section className="space-y-4" aria-label="Published municipal updates"><h2 className="text-xl font-bold">Municipal updates</h2><PublicState {...resource} />{resource.data&&!resource.loading&&!resource.error&&<>
    {!resource.data.data.length?<p>No municipal updates are currently published.</p>:<div className="grid sm:grid-cols-2 gap-6">{resource.data.data.map(item=><article key={item.id} className="border border-brand-border rounded-xl p-6"><p className="text-sm text-brand-muted">{new Date(item.date).toLocaleDateString()}</p><h3 className="text-lg font-bold mt-2"><Link className="text-brand-primary underline min-h-11 inline-flex items-center" to={`/news/view/${item.id}`}>{item.title}</Link></h3><p className="py-3 text-brand-muted">{item.summary}</p></article>)}</div>}
    <PublicPagination pagination={resource.data.pagination} onPage={setPage} />
  </>}</section>;
}
