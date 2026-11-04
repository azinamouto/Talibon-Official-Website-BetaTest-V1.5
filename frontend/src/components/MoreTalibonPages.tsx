import { useId, useState } from 'react';
import { ArrowUpRight, BriefcaseBusiness, Camera, ChevronDown, Facebook, Flame, Grid2X2, ShieldCheck, Users } from 'lucide-react';
import { OFFICIAL_FACEBOOK_URLS } from '../constants';
import styles from './MoreTalibonPages.module.css';

const pages = [
  { name: 'Tourism', icon: Camera, url: OFFICIAL_FACEBOOK_URLS.MAIN },
  { name: 'PNP', icon: ShieldCheck, url: OFFICIAL_FACEBOOK_URLS.MAIN },
  { name: 'BFP', icon: Flame, url: OFFICIAL_FACEBOOK_URLS.MAIN },
  { name: 'SK Federation', icon: Users, url: OFFICIAL_FACEBOOK_URLS.MAIN },
  { name: 'PESO', icon: BriefcaseBusiness, url: OFFICIAL_FACEBOOK_URLS.MAIN },
  { name: 'Abante Talibon', icon: Facebook, url: OFFICIAL_FACEBOOK_URLS.MAIN },
];

export default function MoreTalibonPages({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  const titleId = `${id}-title`;
  const panelId = `${id}-panel`;
  return <div className={styles.card} data-more-pages>
    <h3 className={styles.heading}>
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={panelId}
        onClick={() => setOpen(value => !value)}>
        <span className={styles.gridIcon}><Grid2X2 size={24} aria-hidden="true" /></span>
        <span className={styles.copy}>
          <span id={titleId} className={styles.title}>More Talibon pages</span>
          <span className={styles.subtitle}>6 pages: police, fire, youth, jobs and more</span>
        </span>
        <span className={styles.action}>{open ? 'Hide' : 'Show'}</span>
        <span className={styles.chevron} data-open={open}><ChevronDown size={20} aria-hidden="true" /></span>
      </button>
    </h3>
    <div id={panelId} role="region" aria-labelledby={titleId} className={styles.panel} data-open={open}
      inert={!open} style={{ visibility: open ? 'visible' : 'hidden' }}>
      <div className={styles.panelInner}>
        <ul className={styles.list}>
          {pages.map(({ name, icon: Icon, url }) => <li key={name}>
            <a href={url} target="_blank" rel="noopener noreferrer" tabIndex={open ? undefined : -1} className={styles.link}>
              <span className={styles.icon}><Icon size={18} aria-hidden="true" /></span>
              <span className={styles.name}>{name}</span>
              <ArrowUpRight size={18} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>)}
        </ul>
      </div>
    </div>
  </div>;
}
