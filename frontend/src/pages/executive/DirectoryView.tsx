import { Phone, Building2 } from 'lucide-react';
import { charterGroups } from '../../data/charterDirectory';
import styles from './DirectoryView.module.css';

interface DirectoryEntry { department: string; contact?: string }
const officeKey = (name: string) => name.replace(/[\u2019']/g, '').toLowerCase().trim();

export default function DirectoryView({ data }: { data: DirectoryEntry[] }) {
  const contacts = Array.isArray(data) ? data : [];
  // Reuse the existing Charter roster and retain directory-only offices.
  // TODO: Replace API placeholder contacts with LGU-verified phone numbers.
  // Never assign another office's contact to offices without supplied numbers.
  const entries: DirectoryEntry[] = charterGroups.flatMap(group => group.offices).map(office =>
    contacts.find(entry => officeKey(entry.department) === officeKey(office.name)) || { department: office.name });
  for (const contact of contacts) {
    if (!entries.some(entry => officeKey(entry.department) === officeKey(contact.department))) entries.push(contact);
  }
  return <div className={styles.grid}>
    {entries.length ? entries.map(entry => <article key={entry.department} className={styles.card}>
      <div className={styles.identity}>
        <span className={styles.icon}><Building2 size={18} aria-hidden="true" /></span>
        <h2>{entry.department}</h2>
      </div>
      {entry.contact ? <a href={`tel:${entry.contact.replace(/[^+\d]/g, '')}`} className={styles.phone}
        aria-label={`Call ${entry.department}: ${entry.contact}`}>
        <Phone size={13} aria-hidden="true" /><span>{entry.contact}</span>
      </a> : <p className={styles.unavailable}>Contact number not listed</p>}
    </article>) : <p className={styles.empty}>No directory entries found.</p>}
  </div>;
}

