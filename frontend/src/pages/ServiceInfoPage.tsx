import React, { useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { publicDetail, PublicService } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import { PublicShell, PublicState } from '../components/PublicContent';

export default function ServiceInfoPage() {
  const { slug = '' } = useParams();
  const resource = usePublicResource(useCallback((signal: AbortSignal) => publicDetail<PublicService>('services', slug, signal), [slug]));
  const service = resource.data;
  return <PublicShell title={service?.name || 'Service information'}>
    <Link to="/services" className="text-brand-primary">? Back to services</Link>
    <PublicState {...resource} />
    {!resource.loading && !resource.error && (service ? <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6 min-w-0">
        <section className="civic-card p-6 space-y-3"><h2 className="text-xl font-bold">Overview</h2><p className="whitespace-pre-wrap">{service.description || 'No description has been published.'}</p></section>
        {service.purpose && <section className="civic-card p-6 space-y-3"><h2 className="text-xl font-bold">Purpose</h2><p className="whitespace-pre-wrap">{service.purpose}</p></section>}
        <section className="civic-card p-6 space-y-3"><h2 className="text-xl font-bold">Requirements</h2>
          {service.requirements?.length ? <ul className="list-disc pl-5 space-y-2">{service.requirements.map((requirement, index) => <li key={index}>{requirement}</li>)}</ul> : <p>No requirements have been published. Contact the responsible office for details.</p>}
        </section>
        {!!service.downloadable_forms?.length && <section className="civic-card p-6 space-y-3"><h2 className="text-xl font-bold">Downloadable forms</h2><ul className="space-y-2">{service.downloadable_forms.filter(form => /^https?:\/\//i.test(form.url)).map((form, index) => <li key={index}><a className="text-brand-primary underline" href={form.url} target="_blank" rel="noopener noreferrer">{form.title}</a></li>)}</ul></section>}
      </div>
      <aside className="civic-card p-6 space-y-5 min-w-0"><h2 className="text-xl font-bold">Service details</h2>
        <dl className="space-y-4">{[['Responsible office', service.office_responsible], ['Processing time', service.processing_time], ['Fees', service.fees], ['Office hours', service.office_hours], ['Contact', service.contact_info], ['Address', service.physical_address]].map(([label, value]) => <div key={label}><dt className="font-semibold">{label}</dt><dd className="text-brand-muted whitespace-pre-wrap">{value || 'Not yet published'}</dd></div>)}</dl>
      </aside>
    </div> : <p role="status" className="civic-card p-8">Service not found. It may no longer be available.</p>)}
  </PublicShell>;
}
