export type { CertificateRequest, TimelineEvent } from '../services/certificateService';

import styles from './EServicesPage.module.css';

export default function EServicesPage() {
  return <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-20" aria-labelledby="electronic-services-title">
    <div className={`civic-card ${styles.card} border p-6 sm:p-10`}>
      <h1 id="electronic-services-title" className="text-3xl font-bold text-neutral-900 sm:text-4xl">Electronic Services</h1>
      <h2 className="mt-6 text-xl font-semibold text-neutral-900">To Be Implemented</h2>
      <p className="mt-6 leading-relaxed text-neutral-700">The Municipality of Talibon is preparing to introduce online services to make government transactions more accessible and convenient.</p>
      <p className="mt-4 leading-relaxed text-neutral-700">For now, please visit the appropriate municipal office for assistance with applications, permits, and other transactions.</p>
    </div>
  </section>;
}
