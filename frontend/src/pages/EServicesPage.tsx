export type { CertificateRequest, TimelineEvent } from '../services/certificateService';

export default function EServicesPage() {
  return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20" aria-labelledby="electronic-services-title">
    <div className="civic-card border border-brand-border p-6 sm:p-10">
      <h1 id="electronic-services-title" className="text-3xl font-bold text-brand-text sm:text-4xl">Electronic Services</h1>
      <h2 className="mt-6 text-xl font-semibold text-brand-primary">To Be Implemented</h2>
      <p className="mt-6 leading-relaxed text-brand-text">The Municipality of Talibon is preparing to introduce online services to make government transactions more accessible and convenient.</p>
      <p className="mt-4 leading-relaxed text-brand-text">For now, please visit the appropriate municipal office for assistance with applications, permits, and other transactions.</p>
    </div>
  </section>;
}
