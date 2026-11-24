import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BARANGAY_REFERENCE, type BarangayReference } from '../data/barangayDirectory';
import styles from './BarangaySelector.module.css';
import cardStyles from '../pages/about/BarangaysView.module.css';
import BarangayLogo from './BarangayLogo';

type PickerBarangay = BarangayReference & {
  captain_name?: string | null; captain?: string | null; contact_number?: string | null;
  office_address?: string | null; office_hours?: string | null;
};
const records: readonly PickerBarangay[] = [...BARANGAY_REFERENCE].sort((a, b) => a.name.localeCompare(b.name, 'en'));
const filters = ['All', 'Mainland', 'Island'] as const;
const itemsPerPage = 6;

export default function BarangaySelector() {
  const [location, setLocation] = useState<typeof filters[number]>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const matches = records.filter(item => location === 'All' || item.location === location);
  const totalPages = Math.ceil(matches.length / itemsPerPage);
  const page = Math.min(currentPage, Math.max(1, totalPages));
  const visible = matches.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  return <section id="barangays" aria-labelledby="barangays-heading" className={styles.section}>
    <div className={styles.container}>
      <div className={styles.header}>
        <p className={styles.eyebrow}>Community directory</p>
        <h2 id="barangays-heading" className={styles.title}>Barangays of Talibon</h2>
        <p className={styles.intro}>Explore the barangays serving Talibon and its communities.</p>
      </div>
      <fieldset className={styles.filters}>
        <legend className="sr-only">Browse by location</legend>
        <div className={styles.filterRow}>
          {filters.map(filter => <label key={filter} className={styles.control}>
            <input className={styles.radio} type="radio" name="barangay-location" value={filter}
              checked={location === filter} onChange={() => { setLocation(filter); setCurrentPage(1); }} aria-controls="barangay-cards" />
            <span className={styles.tab}>{filter}<span className={styles.count} aria-hidden="true">{filter === 'All' ? records.length : records.filter(item => item.location === filter).length}</span></span>
          </label>)}
        </div>
      </fieldset>
      <p role="status" className={styles.results}>Showing {(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, matches.length)} of {matches.length} barangays</p>
      <div id="barangay-cards" className={styles.grid}>
        {visible.map(item => <article key={item.name} className={cardStyles.card}>
          <div className={cardStyles.cardHeader}>
            <BarangayLogo name={item.name} className={cardStyles.logo}
              fallback={<span className={cardStyles.logoFallback} aria-hidden="true">{item.name.charAt(0)}</span>} />
            <div className={cardStyles.identity}>
              <h3 className={styles.cardTitle}>{item.name}</h3>
              <p className={cardStyles.category}>{item.location}{item.name === 'Poblacion' ? ' · Town center' : ''}</p>
            </div>
          </div>
          <dl className={cardStyles.details}>
            <div><dt>Office hours</dt><dd>{item.office_hours || 'Not specified'}</dd></div>
            {item.contact_number && <div><dt>Contact number</dt><dd>{item.contact_number}</dd></div>}
            {item.office_address && <div><dt>Office address</dt><dd>{item.office_address}</dd></div>}
          </dl>
          <dl className={cardStyles.officer}>
            <div><dt>Captain:</dt><dd>{item.captain_name || item.captain || 'Not specified'}</dd></div>
          </dl>
        </article>)}
      </div>
      <div className={styles.footer}>
        {totalPages > 1 && <nav className={styles.pagination} aria-label="Homepage barangay results pages">
          <button type="button" disabled={page === 1} onClick={() => setCurrentPage(page - 1)}>Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page === totalPages} onClick={() => setCurrentPage(page + 1)}>Next</button>
        </nav>}
        <Link to="/about/barangays" className={styles.button}>View full directory</Link>
      </div>
      <p className={styles.source}>Poblacion is counted under Mainland. Barangay names: <a href="https://psa.gov.ph/classification/psgc/barangays/0701243000" target="_blank" rel="noopener noreferrer">PSA reference<span className="sr-only"> (opens in a new tab)</span></a></p>
    </div>
  </section>;
}
