import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Download, File, FileText, HardHat, ScrollText, Search, Sprout, Stethoscope, Store, type LucideIcon } from 'lucide-react';
import { charterGroups, charterTasks, charterPdf, matchesCharterOffice, type CharterOffice } from '../data/charterDirectory';
import styles from './CitizensCharterSection.module.css';

const taskPresentation: Record<string, { icon: LucideIcon; title: string }> = {
  'Birth, marriage or death certificate': { icon: FileText, title: 'Get a birth, marriage or death certificate' },
  'Business permit': { icon: Store, title: 'Apply for a business permit' },
  'Building permit': { icon: HardHat, title: 'Apply for a building permit' },
  'Tax declaration': { icon: ScrollText, title: 'Declare property for tax' },
  'Medical consultation': { icon: Stethoscope, title: 'See a doctor' },
  'Burial lot': { icon: Sprout, title: 'Find a burial lot' },
};
const groupId = (name: string) => `charter-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

function OfficeCard({ office }: { office: CharterOffice }) {
  const nameId = `charter-office-${office.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const actionId = `${nameId}-action`;
  const action = <>
    <span>{office.contacts ? 'Office contacts' : office.page ? 'Office guide' : 'Full charter'}</span>
    {!office.contacts && <File size={16} strokeWidth={1.7} aria-hidden="true" />}
    {!office.contacts && <span className={styles.srOnly}> (opens in a new tab)</span>}
  </>;
  return <li className={styles.officeItem}><article className={styles.officeRow} aria-labelledby={nameId}>
    <div className={styles.officeIdentity}>
      <h4 id={nameId}>{office.name}</h4>
      {office.acronym && <p className={styles.acronym}>{office.acronym}</p>}
    </div>
    <ul className={styles.previews}>{office.services.map(service => <li key={service}>{service}</li>)}</ul>
    {office.contacts
      ? <Link id={actionId} className={styles.officeAction} aria-labelledby={`${nameId} ${actionId}`} to="/executive/directory">{action}</Link>
      : <a id={actionId} className={styles.officeAction} aria-labelledby={`${nameId} ${actionId}`} href={`${charterPdf}${office.page ? `#page=${office.page}` : ''}`} target="_blank" rel="noopener noreferrer">{action}</a>}
  </article></li>;
}

function InternalOfficeGroup({ name, offices }: { name: string; offices: CharterOffice[] }) {
  const [open, setOpen] = useState(false);
  return <details id={groupId(name)} className={styles.internal} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className={styles.summary} aria-expanded={open}>
      <span><h3>{name}</h3><small>Staff services and legislative matters · {offices.length} offices</small></span>
      <ChevronDown size={20} aria-hidden="true" />
    </summary>
    <ul className={styles.officeList} aria-label={name}>{offices.map(office => <OfficeCard key={office.name} office={office} />)}</ul>
  </details>;
}

export default function CitizensCharterSection() {
  const [query, setQuery] = useState('');
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const searching = query.trim().length > 0;
  const groups = charterGroups.map(group => ({ ...group, offices: group.offices.filter(office => matchesCharterOffice(office, query)) }));
  const count = groups.reduce((sum, group) => sum + group.offices.length, 0);

  return <section id="charter" aria-labelledby="charter-title" className={styles.section}>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Inter:wght@400;600&family=Newsreader:wght@500&display=swap" />
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 id="charter-title">What do you need to do today?</h2>
        <svg className={styles.underline} viewBox="0 0 285 14" aria-hidden="true" focusable="false">
          <path d="M2 8C34 1 56 12 87 7S135 2 174 7S230 12 283 4" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
        <div className={styles.introduction}>
          <p>Pick a task to open its PDF guide, or find the office that handles it.<br />PDFs open in a new tab.</p>
          <p className={styles.note}>Not sure where to go? Start here.</p>
        </div>
      </div>
      <ul className={styles.taskList} aria-label="Start with a task">{charterTasks.map(task => {
        const { icon: Icon, title } = taskPresentation[task.label];
        const content = <>
          <Icon className={styles.taskIcon} size={28} strokeWidth={1.7} aria-hidden="true" />
          <span className={styles.taskCopy}>
            <strong className={styles.taskTitle}>{title}</strong>
            <span className={styles.taskType}>{task.page ? 'Open PDF guide' : 'Find the office'}</span>
          </span>
          {task.page && <span className={styles.srOnly}> (opens in a new tab)</span>}
        </>;
        return <li key={task.label}>
          {task.page ? <a className={styles.taskCard} href={`${charterPdf}#page=${task.page}`} target="_blank" rel="noopener noreferrer">{content}</a>
            : <button className={styles.taskCard} type="button" onClick={() => { setQuery(task.search ?? ''); resultsRef.current?.focus(); }}>{content}</button>}
        </li>;
      })}</ul>
      <section className={styles.directory} aria-labelledby="office-directory-title">
        <h2 id="office-directory-title">Offices, grouped by what they handle</h2>
        <nav className={styles.groupLinks} aria-label="Office groups">
          {groups.filter(group => !group.internal && group.offices.length > 0).map(group => <a key={group.name} href={`#${groupId(group.name)}`}>{group.name}</a>)}
        </nav>
        <div className={styles.controls}>
          <div className={styles.searchField}>
            <label htmlFor="charter-search">Search offices and services</label>
            <div className={styles.searchInput}><Search size={20} aria-hidden="true" />
              <input id="charter-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder='Try “birth certificate” or “LCRO”' />
            </div>
          </div>
          <a className={styles.download} href={charterPdf} target="_blank" rel="noopener noreferrer">
            <Download size={18} aria-hidden="true" /> Download full charter <span>(PDF, 7.0 MB)</span>
            <span className={styles.srOnly}>Opens in a new tab</span>
          </a>
        </div>
        <div className={styles.results}>
          <p ref={resultsRef} className={searching ? undefined : styles.srOnly} tabIndex={-1} role="status" aria-live="polite">{searching ? `${count} matching ${count === 1 ? 'office' : 'offices'}` : 'Offices, grouped by what they handle'}</p>
          {searching && <button type="button" onClick={() => setQuery('')}>Clear search</button>}
        </div>
        {count === 0 && <div className={styles.empty}><h3>No offices found</h3><p>Try a service such as “birth”, an office name, or its acronym.</p><button type="button" onClick={() => setQuery('')}>Show all offices</button></div>}
        {groups.filter(group => group.offices.length > 0).map(group => {
          const list = <ul className={styles.officeList} aria-label={group.name}>{group.offices.map(office => <OfficeCard key={office.name} office={office} />)}</ul>;
          return group.internal && !searching
            ? <InternalOfficeGroup key={group.name} name={group.name} offices={group.offices} />
            : <div id={groupId(group.name)} className={styles.group} key={group.name}><h3>{group.name}</h3>{list}</div>;
        })}
        <p className={styles.source}>Official municipal PDF · Link and file size checked 4 November 2026. Confirm current requirements with the office before visiting.</p>
      </section>
    </div>
  </section>;
}
