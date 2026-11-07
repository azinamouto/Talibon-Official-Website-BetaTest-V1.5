import { useEffect, useRef, useState } from "react";
import { Quote } from "lucide-react";
import styles from "./MayorsView.module.css";

interface Mayor { name: string; term?: string }
interface Commentary { content: string; source: string }
interface MayorSection { section: string; mayors: Mayor[]; commentary?: Commentary }
interface MayorsViewProps { data: MayorSection[] }

// Presentation only: preserve original title, date and note strings verbatim.
export function splitEraTitle(title: string) {
  const match = title.match(/^(.*?)\s*(\(\d{4}\s+to\s+(?:\d{4}|present)\))$/i);
  return match ? { title: match[1], range: match[2] } : { title, range: '' };
}
export function splitMayorTerm(term?: string) {
  const match = term?.match(/^(.*?)\s*\(([\s\S]*)\)\s*$/);
  return match ? { term: match[1], note: match[2] } : { term: term || '', note: '' };
}

export default function MayorsView({ data }: MayorsViewProps) {
  const eras = Array.isArray(data) ? data : [];
  const prefix = 'mayoral';
  const navigation = useRef<HTMLElement>(null);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const scrollToEra = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  useEffect(() => {
    // Content can arrive after the shared route scroller's initial attempts.
    const id = window.location.hash.slice(1);
    if (id.startsWith(`${prefix}-era-`)) scrollToEra(id);
  }, [data]);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      const cutoff = (navigation.current?.getBoundingClientRect().bottom ?? 0) + 32;
      let current = 0;
      sections.current.forEach((section, index) => {
        if (section && section.getBoundingClientRect().top <= cutoff) current = index;
      });
      setActive(current);
    };
    const queue = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    queue();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', queue); window.removeEventListener('resize', queue); };
  }, [data]);

  if (!eras.length) return <div className="text-center py-24 text-brand-muted font-bold uppercase tracking-widest">No data available.</div>;
  let sequence = 0;
  return <div className={styles.view}>
    <nav ref={navigation} className={styles.jump} aria-label="Jump to mayoral era">
      <span className={styles.jumpLabel}>Jump to era</span>
      <div className={styles.chips}>
        {eras.map((era, index) => {
          const { title, range } = splitEraTitle(era.section);
          return <a key={index} href={`#${prefix}-era-${index}`} aria-label={era.section} title={era.section}
            aria-current={active === index ? 'location' : undefined}>
            {range ? range.slice(1, -1) : title}
          </a>;
        })}
      </div>
    </nav>
    <div className={styles.eras}>
      {eras.map((era, index) => {
        const { title, range } = splitEraTitle(era.section);
        const start = sequence + 1;
        return <section key={index} id={`${prefix}-era-${index}`} className={styles.era} data-mayoral-era
          ref={el => { sections.current[index] = el; }} aria-labelledby={`${prefix}-heading-${index}`}>
          <header className={styles.eraHeader}>
            <h2 id={`${prefix}-heading-${index}`}>{title}</h2>
            {range && <span className={styles.range}>{range}</span>}
          </header>
          <ol start={start} className={styles.cards}>
            {era.mayors.map((mayor, mayorIndex) => {
              const number = ++sequence;
              const details = splitMayorTerm(mayor.term);
              return <li key={mayorIndex} tabIndex={0} className={`civic-card ${styles.card}`}>
                <span className={styles.number} aria-hidden="true">{String(number).padStart(2, '0')}</span>
                <div className={styles.cardBody}>
                  <h3>{mayor.name}</h3>
                  <div className={styles.termRow}>
                    {details.term ? <span className={styles.term}>Term: {details.term}</span> : <span className={styles.missing}>Term not recorded</span>}
                  </div>
                  <div className={styles.notes}>{details.note && <span>{details.note}</span>}</div>
                </div>
              </li>;
            })}
          </ol>
            {era.commentary && (
              <div className="p-8 bg-brand-primary/5 border-l-4 border-brand-primary rounded-r-2xl relative overflow-hidden group">
                <Quote aria-hidden="true" size={48} className="absolute -top-4 -left-4 text-brand-primary/10" />
                <p className="text-xs font-bold text-brand-primary uppercase tracking-widest mb-4">
                  Historical Commentary
                </p>
                <p className="text-xl text-brand-text font-medium leading-relaxed italic">
                  "{era.commentary.content}"
                </p>
                <p className="text-sm font-bold text-brand-muted text-right mt-6">
                  — {era.commentary.source}
                </p>
              </div>
            )}
        </section>;
      })}
    </div>
  </div>;
}
