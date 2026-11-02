import { useState } from "react";
import { ExternalLink, Globe, Map, MapPin, Ruler } from "lucide-react";

export default function Location() {
  const [loadMap, setLoadMap] = useState(false);
  const mapsUrl = "https://www.google.com/maps/place/Talibon,+Bohol";

  return (
    <section
      id="location"
      aria-labelledby="location-heading"
      className="scroll-mt-40 border-t border-brand-border bg-brand-surface py-10 sm:py-12 lg:py-16"
    >
      <div className="site-container">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
          <div className="min-w-0">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand-primary">
              Find us
            </p>
            <h2 id="location-heading" className="font-display text-2xl font-bold tracking-tight text-brand-text sm:text-3xl">
              Location
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-brand-muted sm:text-base sm:leading-7">
              Talibon is a first-class municipality situated in the northernmost part of Bohol, Philippines, approximately 114.8 kilometers from Tagbilaran City.
            </p>

            <dl className="mt-6 grid grid-cols-1 gap-5 border-y border-brand-border py-5 sm:grid-cols-2 sm:gap-6">
              <div className="flex items-start gap-3">
                <Globe size={18} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" />
                <div>
                  <dt className="text-sm text-brand-muted">Coordinates</dt>
                  <dd className="mt-1 text-base font-semibold text-brand-text">10.12°N, 124.28°E</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Ruler size={18} className="mt-0.5 shrink-0 text-brand-primary" aria-hidden="true" />
                <div>
                  <dt className="text-sm text-brand-muted">Land area</dt>
                  <dd className="mt-1 text-base font-semibold text-brand-text">140.46 km²</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-brand-border bg-brand-bg">
            <div className="flex items-center gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-primary" aria-hidden="true">
                <Map size={22} />
              </span>
              <div>
                <h3 className="text-base font-semibold text-brand-text">Talibon, Bohol</h3>
                <p className="mt-0.5 text-sm text-brand-muted">Interactive map</p>
              </div>
            </div>

            {loadMap ? (
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15707.382483838237!2d124.321852028686!3d10.152377484462102!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3307cc27f5e8e8e9%3A0x63359784347716cc!2sTalibon%2C%20Bohol!5e0!3m2!1sen!2sph!4v1713290000000!5m2!1sen!2sph"
                className="mt-5 h-72 w-full border-0 sm:h-80"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Google Maps - Talibon, Bohol"
              />
            ) : (
              <div className="px-5 pt-4 sm:px-6">
                <p id="map-privacy-note" className="max-w-lg text-sm leading-6 text-brand-muted">
                  Explore the area on the map. Loading it connects to Google.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3 px-5 pb-5 pt-5 sm:flex-row sm:flex-wrap sm:px-6 sm:pb-6">
              {!loadMap && (
                <button
                  type="button"
                  onClick={() => setLoadMap(true)}
                  aria-describedby="map-privacy-note"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-text px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-text/90 active:bg-brand-text/80"
                >
                  <MapPin size={16} aria-hidden="true" />
                  Load interactive map
                </button>
              )}
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-border bg-white px-4 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:border-brand-primary hover:text-brand-primary"
              >
                Open in Google Maps
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
