import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Baby, BookOpen, ChevronDown, Download, ExternalLink, FileText, Flower2, HardHat, Search, Stethoscope, Store, type LucideIcon } from 'lucide-react';
import { charterGroups, charterTasks, charterPdf, matchesCharterOffice, type CharterOffice } from '../data/charterDirectory';
import styles from './CitizensCharterSection.module.css';
import intro from './CharterIntro.module.css';
import officeStyles from './OfficeDirectory.module.css';

const taskIcons: Record<string, LucideIcon> = {
  'Birth, marriage or death certificate': Baby,
  'Business permit': Store,
  'Building permit': HardHat,
  'Tax declaration': FileText,
  'Medical consultation': Stethoscope,
  'Burial lot': Flower2,
};

function OfficeCard({ office }: { office: CharterOffice }) {
  const Icon = office.icon;
  const nameId = `charter-office-${office.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const actionId = `${nameId}-action`;
  const action = <>
    {office.contacts ? 'Find office contacts' : office.page ? 'Read office guide (PDF)' : 'Browse full charter (PDF)'}
    {office.contacts ? <ArrowRight size={16} aria-hidden="true" /> : <ExternalLink size={16} aria-hidden="true" />}
    {!office.contacts && <span className={styles.srOnly}> (opens in a new tab)</span>}
  </>;
  return <li className={officeStyles.cardItem}><article className={officeStyles.card} aria-labelledby={nameId}>
    <div className={officeStyles.cardHeading}>
      <span className={officeStyles.icon}><Icon size={24} aria-hidden="true" /></span>
      <div><h4 id={nameId}>{office.name}</h4>{office.acronym && <p className={officeStyles.acronym}>{office.acronym}</p>}</div>
    </div>
    <ul className={officeStyles.previews}>{office.services.map(service => <li key={service}>{service}</li>)}</ul>
    {office.contacts
      ? <Link id={actionId} className={officeStyles.cardAction} aria-labelledby={`${nameId} ${actionId}`} to="/executive/directory">{action}</Link>
      : <a id={actionId} className={officeStyles.cardAction} aria-labelledby={`${nameId} ${actionId}`} href={`${charterPdf}${office.page ? `#page=${office.page}` : ''}`} target="_blank" rel="noopener noreferrer">{action}</a>}
  </article></li>;
}

function InternalOfficeGroup({ name, offices }: { name: string; offices: CharterOffice[] }) {
  const [open, setOpen] = useState(false);
  return <details className={officeStyles.internal} onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className={officeStyles.summary} aria-expanded={open}>
      <span><h3>{name}</h3><small>Staff services and legislative matters · {offices.length} offices</small></span>
      <span className={officeStyles.chevron}><ChevronDown size={20} aria-hidden="true" /></span>
    </summary>
    <ul className={officeStyles.grid} aria-label={name}>{offices.map(office => <OfficeCard key={office.name} office={office} />)}</ul>
  </details>;
}

export default function CitizensCharterSection() {
  const [query, setQuery] = useState('');
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const searching = query.trim().length > 0;
  const groups = charterGroups.map(group => ({ ...group, offices: group.offices.filter(office => matchesCharterOffice(office, query)) }));
  const count = groups.reduce((sum, group) => sum + group.offices.length, 0);

  return <section id="charter" aria-labelledby="charter-title" className={`${styles.section} ${intro.section}`}>
    <div className={intro.top}>
    <div className="site-container">
      <header className={intro.header}>
        <p className={intro.eyebrow}><BookOpen size={16} aria-hidden="true" /> Your guide to municipal services</p>
        <h2 id="charter-title">Citizen’s Charter</h2>
        <p>Find the right office and check the official guide for requirements, steps, fees, and processing times.</p>
      </header>
      <div className={intro.controls}>
        <div className={intro.searchField}>
          <label htmlFor="charter-search">Search offices and services</label>
          <div className={intro.searchInput}><Search size={20} aria-hidden="true" />
            <input id="charter-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder='Try “birth certificate” or “LCRO”' />
          </div>
        </div>
        <a className={intro.download} href={charterPdf} target="_blank" rel="noopener noreferrer">
          <Download size={18} aria-hidden="true" /> Download full charter <span className={intro.fileSize}>(PDF, 7.0 MB)</span>
          <span className={styles.srOnly}>Opens in a new tab</span>
        </a>
      </div>
      <div className={intro.tasks}>
        <h3>Start with a task</h3>
        <p>Open a PDF guide, or find office contacts. PDFs open in a new tab.</p>
        <ul className={intro.taskList} aria-label="Start with a task">{charterTasks.map(task => {
          const Icon = taskIcons[task.label];
          const content = <>
            <span className={intro.taskIcon}><Icon size={28} aria-hidden="true" /></span>
            <span className={intro.taskCopy}>
              <strong className={intro.taskTitle}>{task.label}</strong>
              <span className={intro.taskType}>{task.page ? <ExternalLink size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}{task.page ? 'PDF guide' : 'Find the office'}</span>
            </span>
            {task.page && <span className={styles.srOnly}> (opens in a new tab)</span>}
          </>;
          return <li key={task.label}>
            {task.page ? <a className={intro.taskCard} href={`${charterPdf}#page=${task.page}`} target="_blank" rel="noopener noreferrer">{content}</a>
              : <button className={intro.taskCard} type="button" onClick={() => { setQuery(task.search ?? ''); resultsRef.current?.focus(); }}>{content}</button>}
          </li>;
        })}</ul>
      </div>
    </div>
    </div>
    <section className={`site-container ${officeStyles.directory}`} aria-labelledby="office-directory-title">
      <div className={officeStyles.results}>
        <h2 id="office-directory-title">Browse offices by purpose</h2>
        <p ref={resultsRef} className={searching ? undefined : styles.srOnly} tabIndex={-1} role="status" aria-live="polite">{searching ? `${count} matching ${count === 1 ? 'office' : 'offices'}` : 'Browse offices by purpose'}</p>
        {searching && <button type="button" onClick={() => setQuery('')}>Clear search</button>}
      </div>
      {count === 0 && <div className={styles.empty}><h3>No offices found</h3><p>Try a service such as “birth”, an office name, or its acronym.</p><button type="button" onClick={() => setQuery('')}>Show all offices</button></div>}
      {groups.filter(group => group.offices.length > 0).map(group => {
        const grid = <ul className={officeStyles.grid} aria-label={group.name}>{group.offices.map(office => <OfficeCard key={office.name} office={office} />)}</ul>;
        return group.internal && !searching
          ? <InternalOfficeGroup key={group.name} name={group.name} offices={group.offices} />
          : <div className={officeStyles.group} key={group.name}><h3>{group.name}</h3>{grid}</div>;
      })}
      <p className={styles.source}>Official municipal PDF · Link and file size checked 4 November 2026. Confirm current requirements with the office before visiting.</p>
    </section>
  </section>;
}
