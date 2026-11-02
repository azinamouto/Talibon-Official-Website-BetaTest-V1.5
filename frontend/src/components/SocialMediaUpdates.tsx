import { useState } from "react";
import { ArrowRight, ExternalLink, Facebook } from "lucide-react";

const facebookUrl = "https://www.facebook.com/profile.php?id=100092810378501";
const channels = [
  { name: "Information Office", url: facebookUrl },
  { name: "Abante Talibon", url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "SK Federation", url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "PESO Talibon", url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "PNP Talibon", url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "BFP Talibon", url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "Tourism Office", url: "https://www.facebook.com/TalibonOfficialPage" },
];

export default function SocialMediaUpdates() {
  const [loadEmbed, setLoadEmbed] = useState(false);

  return (
    <section
      id="social-updates"
      aria-labelledby="social-updates-heading"
      className="scroll-mt-40 bg-brand-surface py-10 sm:py-12 lg:py-16"
    >
      <div className="site-container">
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-primary">
              Stay connected
            </p>
            <h2 id="social-updates-heading" className="font-display text-2xl font-bold tracking-tight text-brand-text sm:text-3xl">
              Social media updates
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted sm:text-base">
              Follow Talibon's offices for announcements, community news and updates.
            </p>

            <ul className="mt-4 grid grid-cols-2 gap-x-5 sm:flex sm:max-w-2xl sm:flex-wrap sm:gap-x-7">
              {channels.map(({ name, url }) => (
                <li key={name} className="min-w-0">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex min-h-11 items-center gap-2 py-2 text-sm font-medium text-brand-text underline-offset-4 transition-colors hover:text-brand-primary hover:underline"
                  >
                    <span>{name}</span>
                    <ExternalLink size={12} className="shrink-0 text-brand-muted group-hover:text-brand-primary" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 border-t border-brand-border pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
            <div className="flex items-center gap-2.5">
              <Facebook size={20} className="shrink-0 text-brand-primary" aria-hidden="true" />
              <h3 className="font-display text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
                Talibon on Facebook
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              Talibon Public Information Office
            </p>

            {loadEmbed ? (
              <div className="mt-5">
                <iframe
                  src={"https://www.facebook.com/plugins/page.php?href=" + encodeURIComponent(facebookUrl) + "&tabs=timeline&width=500&height=500&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId"}
                  width="500"
                  height="500"
                  className="w-full max-w-[500px] border-0"
                  scrolling="no"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  title="Talibon Facebook Feed"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setLoadEmbed(true)}
                aria-describedby="facebook-privacy-note"
                className="group mt-3 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-brand-text transition-colors hover:text-brand-primary"
              >
                <span className="border-b border-current pb-1">Load Facebook feed</span>
                <ArrowRight size={16} className="text-brand-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            )}

            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex min-h-11 w-fit items-center gap-2 py-2 text-sm text-brand-muted underline-offset-4 transition-colors hover:text-brand-text hover:underline"
            >
              Open on Facebook
              <ExternalLink size={13} aria-hidden="true" />
            </a>
            {!loadEmbed && (
              <p id="facebook-privacy-note" className="mt-1 text-xs leading-5 text-brand-muted">
                Loading the feed connects to Meta.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
