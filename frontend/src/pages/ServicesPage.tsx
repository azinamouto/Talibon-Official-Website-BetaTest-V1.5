import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { listPublic, PublicService } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import { PublicShell, PublicState, PublicPagination, pageNumber } from '../components/PublicContent';
import GovernmentServicesView from './about/GovernmentServicesView';

export default function ServicesPage() {
  const [params, setParams] = useSearchParams();
  const page = pageNumber(params.get('page'));
  const resource = usePublicResource(useCallback((signal: AbortSignal) => listPublic<PublicService>('services', { page, limit: 12 }, signal), [page]));
  return <PublicShell title="Government Services">
    <p className="text-brand-muted">Find requirements, fees, processing times, and the office responsible for each municipal service.</p>
    <PublicState {...resource} />
    {!resource.loading && !resource.error && resource.data && <>
      <GovernmentServicesView data={resource.data.data} />
      <PublicPagination pagination={resource.data.pagination} onPage={page => setParams({ page: String(page) })} />
    </>}
  </PublicShell>;
}
