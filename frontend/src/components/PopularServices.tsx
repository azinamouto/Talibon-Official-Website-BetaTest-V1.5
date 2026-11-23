import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass } from 'lucide-react';
import shared from './HomeServices.module.css';
import styles from './PopularServices.module.css';

// Keep the pre-launch notice self-contained so it can be replaced when services launch.
export default function PopularServices() {
  return (
    <section className={`${shared.section} ${styles.section}`} id="popular-services" aria-label="Electronic services">
      <div className={`site-container ${shared.container}`}>
        <div className={styles.message}>
          <div className={styles.icon}><Hourglass size={22} aria-hidden="true" /></div>
          <h2 id="electronic-services-heading" className={styles.heading}>Coming soon</h2>
          <p className={styles.description}>
            We are preparing online services for Talibon residents. Until they open, you can check
            requirements, fees and processing times in the Citizen's Charter and visit the office in person.
          </p>
          <Link to="/transparency/charter" className={`${shared.textLink} ${styles.action}`}>
            See how to get services today <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
