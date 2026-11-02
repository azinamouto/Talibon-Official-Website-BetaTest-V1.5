import { useState } from "react";
import { BriefcaseBusiness, Camera, ExternalLink, Facebook, Flame, MessageSquare, ShieldCheck, Users } from "lucide-react";

const facebookUrl = "https://www.facebook.com/profile.php?id=100092810378501";
const channels = [
  { name: "Information Office", icon: MessageSquare, url: facebookUrl },
  { name: "Abante Talibon", icon: Facebook, url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "SK Federation", icon: Users, url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "PESO Talibon", icon: BriefcaseBusiness, url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "PNP Talibon", icon: ShieldCheck, url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "BFP Talibon", icon: Flame, url: "https://www.facebook.com/TalibonOfficialPage" },
  { name: "Tourism Office", icon: Camera, url: "https://www.facebook.com/TalibonOfficialPage" },
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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
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

            <ul className="mt-5 grid gap-x-6 sm:grid-cols-2">
              {channels.map(({ name, icon: Icon, url }) => (
                <li key={name} className="min-w-0">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex min-h-14 items-center gap-3 border-b border-brand-border py-3 text-sm font-medium text-brand-text transition-colors hover:text-brand-primary"
                  >
                    <Icon size={18} className="shrink-0 text-brand-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{name}</span>
                    <ExternalLink size={14} className="shrink-0 text-brand-muted group-hover:text-brand-primary" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-brand-border bg-brand-bg">
            <div className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#1877F2]" aria-hidden="true">
                <Facebook size={22} />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-brand-text">Facebook updates</h3>
                <p className="mt-0.5 text-sm leading-5 text-brand-muted">Talibon Public Information Office</p>
              </div>
            </div>

            {loadEmbed ? (
              <div className="mt-5 flex justify-center bg-white">
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
              <div className="px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                <p id="facebook-privacy-note" className="max-w-lg text-sm leading-6 text-brand-muted">
                  View the latest posts here, or open the page on Facebook. Loading the feed connects to Meta.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => setLoadEmbed(true)}
                    aria-describedby="facebook-privacy-note"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-text px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-text/90 active:bg-brand-text/80"
                  >
                    <Facebook size={16} aria-hidden="true" />
                    Load Facebook feed
                  </button>
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary hover:text-brand-primary"
                  >
                    Open on Facebook
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                </div>
                <p className="mt-4 text-xs leading-5 text-brand-muted">
                  The feed stays unloaded until you choose to view it.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
