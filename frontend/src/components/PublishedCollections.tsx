import { useCallback, useState } from 'react';
import { listPublic, type PublicAttachment } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import { PublicPagination, PublicState } from './PublicContent';
import PublishedAttachments from './PublishedAttachments';
type Collection={id:string;title:string;description:string;attachments:PublicAttachment[]};
export default function PublishedCollections({kind='galleries',category,title='Photo collections'}:{kind?:string;category?:string;title?:string}) {
  const [page,setPage]=useState(1);
  const resource=usePublicResource(useCallback((signal:AbortSignal)=>listPublic<Collection>(`public-content/${kind}`,{page,limit:12,...(category?{category}:{})},signal),[kind,category,page]));
  return <section className="mt-8 space-y-6" aria-label={title}><h2 className="text-xl font-bold">{title}</h2><PublicState {...resource} />{resource.data&&!resource.loading&&!resource.error&&<>
    {!resource.data.data.length?<p>No publications are available in this section.</p>:resource.data.data.map(collection=><article key={collection.id} className="border-t border-brand-border pt-6"><h3 className="text-lg font-bold">{collection.title}</h3><p className="whitespace-pre-wrap text-brand-muted py-3">{collection.description}</p><PublishedAttachments attachments={collection.attachments} /></article>)}
    <PublicPagination pagination={resource.data.pagination} onPage={setPage} />
  </>}</section>;
}
