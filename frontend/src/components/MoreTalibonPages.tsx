import { ArrowRight, BriefcaseBusiness, Camera, Facebook, Flame, ShieldCheck, Users } from 'lucide-react';
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

export default function MoreTalibonPages() {
  return <nav className={styles.card} aria-label="More Talibon pages" data-more-pages>
    <ul className={styles.list}>
      {pages.map(({ name, icon: Icon, url }) => <li key={name}>
        <a href={url} target="_blank" rel="noopener noreferrer" className={styles.link}>
          <Icon size={14} aria-hidden="true" />{name}<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </li>)}
    </ul>
    <a href={OFFICIAL_FACEBOOK_URLS.MAIN} target="_blank" rel="noopener noreferrer" className={styles.all}>
      All pages <ArrowRight size={14} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
    </a>
  </nav>;
}
