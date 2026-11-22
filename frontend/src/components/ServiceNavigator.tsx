import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CloudOff } from 'lucide-react';
import { listPublic, type PublicService } from '../services/publicApi';
import { usePublicResource } from '../hooks/usePublicResource';
import GovernmentServicesView from '../pages/about/GovernmentServicesView';
import shared from './HomeServices.module.css';
import styles from './ServiceNavigator.module.css';

export default function ServiceNavigator() {
  const resource = usePublicResource(useCallback((signal: AbortSignal) => listPublic<PublicService>('services', { limit: 6 }, signal), []));
  return <section id="municipal-services" aria-labelledby="municipal-services-heading" aria-busy={resource.loading} className={`${shared.section} ${styles.section}`}>
    <div className={`site-container ${shared.container}`}>
      <div className={shared.header}>
        <h2 id="municipal-services-heading" className={shared.heading}>Municipal services</h2>
        <Link to="/services" className={shared.textLink}>View all services <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      {resource.loading ? <div role="status" aria-label="Loading municipal services">
        <span className="sr-only">Loading municipal services</span>
        <div className={styles.skeletonGrid} aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => <div key={index} className={styles.skeletonCard}>
            <span className={styles.skeletonTitle} /><span className={styles.skeletonLine} /><span className={styles.skeletonShort} />
          </div>)}
        </div>
      </div> : resource.error ? <div role="alert" className={styles.error}>
        <CloudOff size={18} aria-hidden="true" className={styles.errorIcon} />
        <p>Services couldn't load. Check your connection and try again.</p>
        <button type="button" className={shared.ghost} onClick={resource.retry}>Try again</button>
      </div> : resource.data && <GovernmentServicesView data={resource.data.data} />}
    </div>
  </section>;
}
