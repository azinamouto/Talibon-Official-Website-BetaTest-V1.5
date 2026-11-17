import { useCallback, useState } from 'react';
import { listPublic } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import { PublicPagination, PublicState } from './PublicContent';
import FestivitiesView from '../pages/tourism/FestivitiesView';

export default function PublishedEvents() {
  const [page,setPage]=useState(1);
  const resource=usePublicResource(useCallback((signal:AbortSignal)=>listPublic<Parameters<typeof FestivitiesView>[0]['data'][number]>('public-content/events',{page,limit:12},signal),[page]));
  return <><PublicState {...resource}/>{resource.data && !resource.loading && !resource.error && <>{resource.data.data.length?<FestivitiesView data={resource.data.data}/>:<p>No events are currently published.</p>}<PublicPagination pagination={resource.data.pagination} onPage={setPage}/></>}</>;
}
