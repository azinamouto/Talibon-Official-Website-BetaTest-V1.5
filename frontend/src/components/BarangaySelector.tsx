import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, MapPin, Search, Waves } from 'lucide-react';
import { BARANGAY_REFERENCE, type BarangayReference } from '../data/barangayDirectory';
import styles from './BarangaySelector.module.css';

// Optional fields use the existing full-directory field names. The homepage
// reference currently contains only name/location; no additional feed is fetched.
type PickerBarangay = BarangayReference & {
  captain_name?: string | null; captain?: string | null; contact_number?: string | null;
  office_address?: string | null; office_hours?: string | null;
};
const records: readonly PickerBarangay[] = BARANGAY_REFERENCE;
const locations = [...new Set(records.map(item => item.location))];
const filters = ['All', ...locations] as const;
type LocationFilter = 'All' | BarangayReference['location'];
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const slug = (value: string) => normalize(value).replace(/\s+/g, '-');
const alphabetical = [...records].sort((a, b) => a.name.localeCompare(b.name, 'en'));
const defaultBarangay = records.find(item => normalize(item.name) === 'poblacion') ?? alphabetical[0];
function fromHash(hash: string) {
  if (!hash.startsWith('#barangay=')) return undefined;
  try { const value = decodeURIComponent(hash.slice('#barangay='.length)); return records.find(item => slug(item.name) === value); }
  catch { return undefined; }
}
const detailRows = (item: PickerBarangay) => [
  ['Punong Barangay', item.captain_name || item.captain], ['Contact', item.contact_number],
  ['Office address', item.office_address], ['Office hours', item.office_hours],
].filter((row): row is [string, string] => typeof row[1] === 'string' && row[1].trim().length > 0);

export default function BarangaySelector() {
  const route = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState<LocationFilter>('All');
  const [selectedName, setSelectedName] = useState(() => (fromHash(route.hash) ?? defaultBarangay)?.name ?? '');
  const details = useRef<HTMLElement>(null);
  const normalizedQuery = normalize(query);
  const isFiltered = normalizedQuery.length > 0 || location !== 'All';
  const matches = useMemo(() => alphabetical.filter(item => (location === 'All' || item.location === location) && normalize(item.name).includes(normalizedQuery)), [normalizedQuery, location]);
  const selected = records.find(item => item.name === selectedName) ?? defaultBarangay;
  const select = useCallback((item: PickerBarangay) => {
    setSelectedName(item.name);
    navigate({ pathname: route.pathname, search: route.search, hash: `barangay=${encodeURIComponent(slug(item.name))}` }, { replace: true, preventScrollReset: true });
  }, [navigate, route.pathname, route.search]);
  useEffect(() => {
    const item = fromHash(route.hash);
    if (item) setSelectedName(item.name);
  }, [route.hash]);
  useEffect(() => {
    if (normalizedQuery && matches.length === 1 && matches[0].name !== selectedName) select(matches[0]);
  }, [matches, normalizedQuery, selectedName, select]);
  const revealDetails = () => {
    if (window.innerWidth >= 900) return;
    requestAnimationFrame(() => {
      const card = details.current;
      if (!card) return;
      const bounds = card.getBoundingClientRect();
      const headerBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 0;
      if (bounds.top < headerBottom || bounds.bottom > window.innerHeight) card.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
  };
  const SelectedIcon = selected?.location === 'Island' ? Waves : MapPin;
  const townCenter = selected && normalize(selected.name) === 'poblacion';

  return <section id="barangays" aria-labelledby="barangays-heading" className={styles.section}>
    <div className="site-container">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Community directory</p>
          <h2 id="barangays-heading" className={styles.title}>Barangays of Talibon</h2>
          <p className={styles.intro}>Pick a barangay to see its details.</p>
        </div>
        <Link to="/about/barangays" className={styles.button}>View full directory <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
      <label className={styles.searchLabel}>
        <span>Find a barangay</span>
        <span className={styles.searchField}><Search size={18} aria-hidden="true" />
          <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search barangays" aria-controls="barangay-options" />
        </span>
      </label>
      <div className={styles.picker}>
        <fieldset className={styles.filters}>
          <legend className="sr-only">Browse by location</legend>
          <div className={styles.filterRow}>
            {filters.map(filter => <label key={filter} className={styles.control}>
              <input className={styles.radio} type="radio" name="barangay-location" value={filter} checked={location === filter} onChange={() => setLocation(filter)} aria-controls="barangay-options" />
              <span className={styles.tab}>{filter}<span className={styles.count} aria-hidden="true">{filter === 'All' ? records.length : records.filter(item => item.location === filter).length}</span></span>
            </label>)}
          </div>
        </fieldset>
        {selected && <aside ref={details} className={styles.details} aria-labelledby="selected-barangay-label selected-barangay-heading" aria-live="polite" aria-atomic="true">
          <p id="selected-barangay-label" className={styles.selectedLabel}>Selected barangay</p>
          <span className={styles.location}><SelectedIcon size={16} aria-hidden="true" />{selected.location}{townCenter ? ' \u00b7 Town center' : ''}</span>
          <h3 id="selected-barangay-heading">{selected.name}</h3>
          {!matches.some(item => item.name === selected.name) && <p className={styles.filterNote}>Not in the current filter</p>}
          {detailRows(selected).length > 0 && <dl className={styles.detailRows}>
            {detailRows(selected).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>}
          <Link to="/about/barangays" className={`${styles.button} ${styles.viewPage}`}>View barangay page <ArrowRight size={18} aria-hidden="true" /></Link>
        </aside>}
        <fieldset id="barangay-options" className={styles.choices}>
          <legend className="sr-only">Barangays</legend>
          <p role="status" aria-live="polite" className={isFiltered ? styles.results : 'sr-only'}>{isFiltered ? `Showing ${matches.length} of ${records.length} barangays` : ''}</p>
          {matches.length ? <div className={styles.chips}>
            {matches.map(item => {
              const Icon = item.location === 'Island' ? Waves : MapPin;
              return <label key={item.name} className={styles.control} onPointerUp={revealDetails}>
                <input className={styles.radio} type="radio" name="barangay" value={item.name} checked={selected.name === item.name} onChange={() => select(item)} title={`${item.name}: ${item.location}`} />
                <span className={styles.chip}><Icon size={16} aria-hidden="true" />{item.name}</span>
              </label>;
            })}
          </div> : <div className={styles.empty}>
            <p>No barangay found. Try a different spelling or clear the filter.</p>
            <button type="button" onClick={() => { setQuery(''); setLocation('All'); }}>Reset search and filters</button>
          </div>}
        </fieldset>
      </div>
      <p className={styles.source}>Poblacion is counted under Mainland. Barangay names: <a href="https://psa.gov.ph/classification/psgc/barangays/0701243000" target="_blank" rel="noopener noreferrer">PSA reference<span className="sr-only"> (opens in a new tab)</span></a></p>
    </div>
  </section>;
}
