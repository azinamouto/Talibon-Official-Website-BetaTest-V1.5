import React, { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { listPublic, PublicService } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import { PublicState } from './PublicContent';
import GovernmentServicesView from '../pages/about/GovernmentServicesView';

export default function ServiceNavigator() {
  const resource = usePublicResource(useCallback((signal: AbortSignal) => listPublic<PublicService>('services', { limit: 6 }, signal), []));
  return <section className="py-12 bg-brand-surface">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4"><h2 className="text-2xl font-bold">Municipal services</h2><Link to="/services" className="text-brand-primary font-semibold">View all services ?</Link></div>
      <PublicState {...resource} />
      {!resource.loading && !resource.error && resource.data && <GovernmentServicesView data={resource.data.data} />}
    </div>
  </section>;
}
