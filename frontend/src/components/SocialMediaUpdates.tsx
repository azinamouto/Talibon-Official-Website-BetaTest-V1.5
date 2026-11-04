import solidTheme from "../styles/SolidTheme.module.css";
import { useEffect, useState } from "react";
import compact from "./CompactSections.module.css";
import { BriefcaseBusiness, Camera, Facebook, Flame, MessageSquare, ShieldCheck, Users } from "lucide-react";
import { OFFICIAL_FACEBOOK_URLS } from "../constants";
import { parseSocialCache, type SocialCache } from "../services/socialUpdates";

const groups = [
  { name: "Official", offices: [
    { name: "Information Office", icon: MessageSquare, url: OFFICIAL_FACEBOOK_URLS.PIO },
    { name: "Tourism", icon: Camera, url: OFFICIAL_FACEBOOK_URLS.MAIN },
  ] },
  { name: "Public safety", offices: [
    { name: "PNP", icon: ShieldCheck, url: OFFICIAL_FACEBOOK_URLS.MAIN },
    { name: "BFP", icon: Flame, url: OFFICIAL_FACEBOOK_URLS.MAIN },
  ] },
  { name: "Community", offices: [
    { name: "SK Federation", icon: Users, url: OFFICIAL_FACEBOOK_URLS.MAIN },
    { name: "PESO", icon: BriefcaseBusiness, url: OFFICIAL_FACEBOOK_URLS.MAIN },
    { name: "Abante Talibon", icon: Facebook, url: OFFICIAL_FACEBOOK_URLS.MAIN },
  ] },
];
const dateFormat = new Intl.DateTimeFormat("en-PH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Manila" });

export default function SocialMediaUpdates() {
  const [cache, setCache] = useState<SocialCache | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  useEffect(() => {
    const controller = new AbortController();
    fetch(`${import.meta.env.BASE_URL}data/social-updates.json`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
      .then(response => { if (!response.ok) throw new Error("Cache unavailable"); return response.json(); })
      .then(data => { setCache(parseSocialCache(data)); setState("ready"); })
      .catch(() => { if (!controller.signal.aborted) setState("error"); });
    return () => controller.abort();
  }, []);

  return (
    <section id="social-updates" aria-labelledby="social-updates-heading" className={`${solidTheme.section} ${compact.social} scroll-mt-40 bg-brand-surface`}>
      <div className="site-container">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-action">Stay connected</p>
            <h2 id="social-updates-heading" className="font-display text-2xl font-bold text-ink sm:text-3xl">Social media updates</h2>
            <p className="mt-1 max-w-2xl leading-7 text-muted">Announcements, community news and updates from Talibon.</p>
          </div>
          <a href={OFFICIAL_FACEBOOK_URLS.PIO} target="_blank" rel="noopener noreferrer" className="ui-focus inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-action px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-action-hover active:bg-action-hover">
            <Facebook size={18} aria-hidden="true" />Follow on Facebook
          </a>
        </div>
        {cache && cache.posts.length > 0 ? <>
          <div className={`${compact.socialPosts} grid md:grid-cols-3`}>
            {cache.posts.map(post => <article key={post.id} className="min-w-0 overflow-hidden rounded-xl border border-brand-border">
              {post.image ? <img src={`${import.meta.env.BASE_URL}${post.image}`} alt="" loading="lazy" width="640" height="360" className="aspect-video w-full bg-surface object-cover" /> :
                <div className="flex items-center gap-2 border-b border-brand-border bg-surface px-5 py-4 text-sm text-muted"><MessageSquare size={18} className="text-action" aria-hidden="true" />Information Office update</div>}
              <div className={compact.socialPostBody}>
                <time dateTime={post.date} className="text-xs font-medium text-muted">{dateFormat.format(new Date(post.date))}</time>
                <h3 className="mt-2 line-clamp-3 font-display text-lg font-semibold leading-7 text-ink">{post.title}</h3>
                <a href={post.url} target="_blank" rel="noopener noreferrer" aria-label={`Read on Facebook: ${post.title}`} className="ui-focus mt-3 inline-flex min-h-11 items-center rounded text-sm font-semibold text-action underline-offset-4 hover:underline active:text-action-hover">Read on Facebook <span aria-hidden="true" className="ml-2">↗</span></a>
              </div>
            </article>)}
          </div>
          {cache.updatedAt && <p className="mt-3 text-xs text-muted">Last synced {dateFormat.format(new Date(cache.updatedAt))}. Visit Facebook for newer announcements.</p>}
        </> : <p role="status" className={`${compact.socialStatus} rounded-lg bg-surface text-sm leading-6 text-muted`}>
          {state === "loading" ? "Loading recent updates…" : state === "error" ? "Post previews are temporarily unavailable. Visit the Information Office on Facebook for the latest updates." : "Post previews are not available yet. Visit the Information Office on Facebook for the latest updates."}
        </p>}
        <div className={`${compact.socialGroups} border-t border-brand-border`}>
          {groups.map(group => <div key={group.name}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">{group.name}</h3>
            <ul className="flex flex-wrap gap-2">
              {group.offices.map(({ name, icon: Icon, url }) => <li key={name}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="ui-focus inline-flex min-h-11 items-center gap-2 rounded-full border border-brand-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-action hover:bg-surface hover:text-action active:bg-surface">
                  <Icon size={16} className="text-action" aria-hidden="true" />{name}
                </a>
              </li>)}
            </ul>
          </div>)}
        </div>
      </div>
    </section>
  );
}
