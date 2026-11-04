import solidTheme from "../styles/SolidTheme.module.css";
import { useCallback, useState } from "react";
import { ArrowRight, Newspaper, Calendar } from "lucide-react";
import { Link } from "react-router-dom";
import { listPublic, type PublicNews } from "../services/publicApi";
import { usePublicResource } from "../hooks/usePublicResource";
import { PublicState } from "./PublicContent";
import styles from "./NewsTodaySection.module.css";

type HomepageNews = PublicNews & { status?: string; is_test?: boolean };
const sampleTitles = new Set(["kirch pogi", "new website release"]);
const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const providedAuthor = (value?: string | null) => {
  const author = value?.trim();
  return author && !/^municipal admin(?:istrator)?$/i.test(author) ? author : null;
};
function articleDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : { iso: date.toISOString().slice(0, 10), label: dateFormat.format(date) };
}
function NewsImage({ src, title }: { src?: string | null; title: string }) {
  const [failed, setFailed] = useState(false);
  return <div className={styles.imageFrame}>
    {src?.trim() && !failed ? <img src={src.trim()} alt={title} className={styles.image} loading="lazy" width="640" height="360" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
      : <div className={styles.placeholder} data-news-placeholder aria-hidden="true"><Newspaper size={44} strokeWidth={1.75} aria-hidden="true" /></div>}
  </div>;
}
export default function NewsTodaySection() {
  const resource = usePublicResource(useCallback((signal: AbortSignal) => listPublic<HomepageNews>('news', { limit: 3 }, signal), []));
  const newsList = (resource.data?.data || []).filter(item =>
    (!item.status || item.status === 'published') && !item.is_test &&
    !sampleTitles.has(item.title.trim().toLowerCase().replace(/\s+/g, ' ')));
  // The public endpoint supplies published records in date order. For the
  // two-card presentation, explicitly place the newest record in the large card.
  const items = newsList.length === 2 ? [...newsList].sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)) : newsList;
  return <section id="news-today" aria-labelledby="news-announcements-heading" className={`${solidTheme.section} ${styles.section}`}>
    <div className="site-container">
      <div className={styles.header}>
        <div>
          <p className={styles.label}>Press and official announcements</p>
          <h2 id="news-announcements-heading" className={styles.heading}>News and announcements</h2>
          <p className={styles.description}>Official press releases, governance accomplishments, and community news from the Municipality of Talibon.</p>
        </div>
        <Link to="/news" className={styles.button}>View all news <ArrowRight size={18} aria-hidden="true" /></Link>
      </div>
      {resource.loading || resource.error ? <PublicState {...resource} /> : items.length === 0
        ? <p role="status" className={styles.empty}>No news yet. Check back soon.</p>
        : <div className={styles.grid} data-count={items.length} data-authors={items.some(item => providedAuthor(item.author))}>
          {items.map(item => {
            const date = articleDate(item.date);
            const author = providedAuthor(item.author);
            const category = item.category?.trim();
            return <Link key={item.id} to={`/news/view/${item.id}`} aria-labelledby={`news-headline-${item.id}`} className={styles.card} data-news-card>
              <NewsImage key={item.image_url || ''} src={item.image_url} title={item.title} />
              <div className={styles.body}>
                <div className={styles.metadata}>
                  <div className={styles.meta}>
                    {category && <span className={styles.category}>{category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()}</span>}
                    {date && <time dateTime={date.iso} className={styles.date}><Calendar size={16} aria-hidden="true" />{date.label}</time>}
                  </div>
                  {author && <p className={styles.author}>{author}</p>}
                </div>
                <h3 id={`news-headline-${item.id}`} className={styles.title}>{item.title}</h3>
                <p className={styles.excerpt}>{item.summary || item.content}</p>
                <span className={styles.read} aria-hidden="true">Read article <ArrowRight size={18} aria-hidden="true" /></span>
              </div>
            </Link>;
          })}
        </div>}
    </div>
  </section>;
}
