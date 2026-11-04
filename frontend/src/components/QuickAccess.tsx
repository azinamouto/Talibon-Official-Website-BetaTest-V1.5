import { BookOpen, ClipboardPenLine, Download, HandHelping, Map, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './QuickAccess.module.css';

const quickLinks = [
  { name: 'Apply for a permit', icon: ClipboardPenLine, href: '/services' },
  { name: 'Request a service', icon: HandHelping, href: '/services' },
  { name: 'Use online services', icon: Monitor, href: '/e-services' },
  { name: 'Plan a visit', icon: Map, href: '/tourism/spots' },
  { name: 'Download forms', icon: Download, href: '/downloads' },
  { name: "Read the Citizen's Charter", icon: BookOpen, href: '/transparency/charter' },
];

export default function QuickAccess() {
  return (
    <section className={styles.section} aria-labelledby="quick-links-heading">
      <div className="site-container">
        <h2 id="quick-links-heading" className={styles.heading}>What do you need today?</h2>
        <nav aria-labelledby="quick-links-heading">
          <ul className={styles.grid}>
            {quickLinks.map(({ name, icon: Icon, href }) => (
              <li key={name}>
                <Link to={href} className={styles.link}>
                  <span className={styles.iconBox}><Icon size={28} aria-hidden="true" /></span>
                  <span className={styles.label}>{name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </section>
  );
}
