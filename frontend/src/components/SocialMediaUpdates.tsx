import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { OFFICIAL_FACEBOOK_URLS } from "../constants";
import { parseSocialCache, type SocialCache } from "../services/socialUpdates";
import styles from "./ConnectWithTalibon.module.css";
import MoreTalibonPages from "./MoreTalibonPages";

function FacebookLogo() {
  return <img src={`${import.meta.env.BASE_URL}images/facebook-supplied.jpg`} alt="" aria-hidden="true" width="225" height="138" className={styles.facebookLogo} />;
}
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
    <div id="social-updates" className={styles.social}>
      <div className={styles.card} aria-labelledby="information-office-heading">
        <div className={styles.featureHeading}>
          <span className={styles.featureIcon}><FacebookLogo /></span>
          <h3 id="information-office-heading">Information Office</h3>
        </div>
        <p className={styles.featureDescription}>Announcements, advisories and community news are posted on our official Facebook page.</p>
        <a href={OFFICIAL_FACEBOOK_URLS.PIO} target="_blank" rel="noopener noreferrer" className={`${styles.button} ${styles.primary}`}>
          <span className={styles.buttonLogo}><FacebookLogo /></span>Follow on Facebook
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        {cache && cache.posts.length > 0 ? <>
          <div className={styles.posts}>
            {cache.posts.map(post => <article key={post.id} className={styles.post}>
              {post.image && <img src={`${import.meta.env.BASE_URL}${post.image}`} alt="" loading="lazy" width="80" height="80" className={styles.postImage} />}
              <div className={styles.postBody}>
                <time dateTime={post.date}>{dateFormat.format(new Date(post.date))}</time>
                <h4>{post.title}</h4>
                <a href={post.url} target="_blank" rel="noopener noreferrer" aria-label={`Read on Facebook: ${post.title} (opens in a new tab)`} className={styles.postLink}>
                  Read on Facebook <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
            </article>)}
          </div>
          {cache.updatedAt && <p className={styles.synced}>Last synced {dateFormat.format(new Date(cache.updatedAt))}. Visit Facebook for newer announcements.</p>}
        </> : <p role="status" className="sr-only">
          {state === "loading" ? "Loading recent updates?" : state === "error" ? "Post previews are temporarily unavailable. Visit the Information Office on Facebook for the latest updates." : "Post previews are not available yet. Visit the Information Office on Facebook for the latest updates."}
        </p>}
      </div>
      <MoreTalibonPages />
    </div>
  );
}
