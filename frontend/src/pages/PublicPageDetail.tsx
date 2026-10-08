import React, { useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { PublicPage, publicDetail } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import { PublicShell, PublicState } from '../components/PublicContent';

export default function PublicPageDetail() {
  const { id = '' } = useParams();
  const resource = usePublicResource(useCallback((signal: AbortSignal) => publicDetail<PublicPage>('pages', id, signal), [id]));
  return <PublicShell title={resource.data?.title || 'Municipal information'}>
    <PublicState {...resource} />
    {!resource.loading && !resource.error && (resource.data ? <article className="civic-card p-6 whitespace-pre-wrap">{resource.data.content}</article> : <p role="status">Page not found.</p>)}
  </PublicShell>;
}
