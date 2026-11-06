import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { ABOUT_NAV_LINKS, resolveAboutNavigation } from "../../data/aboutNavigation";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import styles from "./ProfileView.module.css";

interface ProfileViewProps { data: { content: string } }

export default function ProfileView({ data }: ProfileViewProps) {
  const [links, setLinks] = useState(ABOUT_NAV_LINKS);
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;
    const refresh = async () => {
      // Same source, ordering and ABOUT override rule as the navbar.
      const { data, error } = await supabase.from('navigation').select('*').order('order', { ascending: true });
      if (active && !error && Array.isArray(data)) setLinks(resolveAboutNavigation(data));
    };
    void refresh();
    const channel = supabase.channel('profile-about-navigation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'navigation' }, () => void refresh()).subscribe();
    return () => { active = false; void supabase.removeChannel(channel); };
  }, []);

  // Split only blank-line separators at display time. Do not trim or interpret
  // title/byline/reference lines, alter characters, or create section headings.
  const paragraphs = data.content.split(/\r?\n(?:[ \t]*\r?\n)+/).filter(paragraph => paragraph.length > 0);
  return <div className={styles.layout}>
    <article className={`${styles.article} text-lg text-brand-muted font-medium`} aria-label="Brief Profile text">
      {paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
    </article>
    <aside className={styles.sidebar} aria-labelledby="profile-about-heading">
      <h2 id="profile-about-heading">About Talibon</h2>
      <nav aria-labelledby="profile-about-heading">
        <ul className={styles.links}>
          {links.map((link, index) => <li key={`${link.href}-${index}`}>
            <NavLink to={link.href} end className={({ isActive }) => isActive ? styles.current : undefined}>{link.name}</NavLink>
          </li>)}
        </ul>
      </nav>
    </aside>
  </div>;
}
