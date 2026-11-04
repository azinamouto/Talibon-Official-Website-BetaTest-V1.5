import solidTheme from "../styles/SolidTheme.module.css";
import { Link } from 'react-router-dom';
import { ArrowRight, Hourglass, Info } from 'lucide-react';
import styles from './PopularServices.module.css';

export default function PopularServices() {
  // Add a planned-services panel only after the LGU confirms its contents.
  return (
    <section className={`${solidTheme.section} ${styles.section}`} id="popular-services" aria-labelledby="electronic-services-heading">
      <div className="site-container">
        <div className={styles.message}>
          <p className={styles.badge}><Hourglass size={18} aria-hidden="true" />Coming soon</p>
          <h2 id="electronic-services-heading" className={styles.heading}>Electronic services</h2>
          <p className={styles.description}>
            We are preparing online services for Talibon residents. Until they open, you can check
            requirements, fees and processing times in the Citizen's Charter and visit the office in person.
          </p>
          <div className={styles.actions}>
            <Link to="/transparency/charter" className={`${styles.action} ${styles.primary}`}>
              See how to get services today <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link to="/e-services" className={`${styles.action} ${styles.secondary}`}>
              <Info size={18} aria-hidden="true" />Electronic services information
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
