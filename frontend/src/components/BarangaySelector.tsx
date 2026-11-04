import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, MapPin, Search, Waves } from 'lucide-react';
import { BARANGAY_REFERENCE, type BarangayReference } from '../data/barangayDirectory';
import styles from './BarangaySelector.module.css';

const PREVIEW_COUNT = 8;
const FILTERS = ['All', 'Poblacion', 'Mainland', 'Island'] as const;
type LocationFilter = typeof FILTERS[number];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const inLocation = (barangay: BarangayReference, filter: LocationFilter) =>
  filter === 'All' || (filter === 'Poblacion' ? barangay.name === 'Poblacion' : barangay.location === filter);

export default function BarangaySelector() {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState<LocationFilter>('All');
  const [expanded, setExpanded] = useState(false);
  const normalizedQuery = normalize(query);
  const isFiltered = normalizedQuery.length > 0 || location !== 'All';

  const matches = useMemo(() => BARANGAY_REFERENCE
    .filter(barangay => inLocation(barangay, location) && normalize(barangay.name).includes(normalizedQuery))
    .sort((a, b) => a.name.localeCompare(b.name, 'en')), [normalizedQuery, location]);
  const visibleBarangays = expanded || isFiltered ? matches : matches.slice(0, PREVIEW_COUNT);

  return <section id="barangays" aria-labelledby="barangays-heading" className={styles.section}>
    <div className={`site-container ${styles.container}`}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Community directory</p>
          <h2 id="barangays-heading" className={styles.title}>Barangays of Talibon</h2>
          <p className={styles.intro}>Find your community. Browse the mainland, Poblacion, and island barangays.</p>
        </div>

      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchLabel}>
          <span>Find a barangay</span>
          <span className={styles.searchField}>
            <Search size={18} aria-hidden="true" />
            <input type="search" value={query} onChange={event => setQuery(event.target.value)}
              placeholder="Search barangays" aria-controls="barangay-grid" />
          </span>
        </label>
        <fieldset className={styles.filters} aria-labelledby="barangay-location-label">
          <legend id="barangay-location-label">Browse by location</legend>
          <div className={styles.filterRow}>
            {FILTERS.map(filter => <button key={filter} type="button" aria-pressed={location === filter}
              aria-controls="barangay-grid" onClick={() => { setLocation(filter); setExpanded(false); }}>
              {filter}<span className={styles.filterCount} aria-hidden="true">
                {BARANGAY_REFERENCE.filter(barangay => inLocation(barangay, filter)).length}
              </span>
            </button>)}
          </div>
        </fieldset>
        <Link to="/about/barangays" className={styles.directoryLink}>
          View full directory <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <div className={styles.resultsHeader}>
        <p role="status" aria-live="polite" aria-atomic="true">
          {matches.length === 0 ? 'No matching barangays' : `Showing ${visibleBarangays.length} of ${matches.length} ${matches.length === 1 ? 'barangay' : 'barangays'}`}
          {!isFiltered && <span> · A–Z</span>}
        </p>
        <p>Poblacion is also included under Mainland.</p>
      </div>

      {matches.length > 0 ? <ul id="barangay-grid" aria-label="Barangays" className={styles.grid}>
        {visibleBarangays.map(barangay => {
          const Icon = barangay.location === 'Island' ? Waves : MapPin;
          const type = barangay.name === 'Poblacion' ? 'Poblacion · Mainland' : `${barangay.location} barangay`;
          return <li key={barangay.name} className={styles.cardItem}>
            <Link to="/about/barangays" className={styles.card} aria-label={`${barangay.name} ${type}`}>
              <span className={styles.initials} aria-hidden="true">
                {barangay.name.split(' ').map(word => word[0]).join('').slice(0, 2)}
              </span>
              <div className={styles.identity}>
                <h3>{barangay.name}</h3>
                <p className={styles.location}><Icon size={16} aria-hidden="true" />{type}</p>
              </div>
            </Link>
          </li>;
        })}
      </ul> : <div id="barangay-grid" className={styles.empty}>
        <Search size={24} aria-hidden="true" />
        <h3>No barangay found</h3>
        <p>Try a different spelling or reset the search and location filter.</p>
        <button type="button" onClick={() => { setQuery(''); setLocation('All'); setExpanded(false); }}>Reset search and filters</button>
      </div>}

      <div className={styles.footer}>
        {!isFiltered && <button type="button" className={styles.browseButton} aria-expanded={expanded}
          aria-controls="barangay-grid" onClick={() => setExpanded(value => !value)}>
          {expanded ? 'Show fewer barangays' : `Browse all ${BARANGAY_REFERENCE.length} barangays`}
          <ArrowDown size={16} aria-hidden="true" className={expanded ? styles.arrowUp : undefined} />
        </button>}
        <p className={styles.source}>Barangay names: <a href="https://psa.gov.ph/classification/psgc/barangays/0701243000"
          target="_blank" rel="noopener noreferrer">PSA reference<span className="sr-only"> (opens in a new tab)</span></a></p>
      </div>
    </div>
  </section>;
}
