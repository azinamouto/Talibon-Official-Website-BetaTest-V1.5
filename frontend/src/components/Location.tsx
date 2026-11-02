import { useState } from "react";
import { ArrowRight, ExternalLink, MapPin } from "lucide-react";

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
        <div className="grid gap-7 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start lg:gap-16">
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

            <dl className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
              <div>
                <dt className="text-xs leading-5 text-brand-muted">Coordinates</dt>
                <dd className="mt-1 text-base font-semibold text-brand-text">10.12°N, 124.28°E</dd>
              </div>
              <div>
                <dt className="text-xs leading-5 text-brand-muted">Land area</dt>
                <dd className="mt-1 text-base font-semibold text-brand-text">140.46 km²</dd>
              </div>
            </dl>
          </div>

          <div className="min-w-0 border-t border-brand-border pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-1">
            <div className="flex items-center gap-2.5">
              <MapPin size={20} className="shrink-0 text-brand-primary" aria-hidden="true" />
              <h3 className="font-display text-xl font-semibold tracking-tight text-brand-text sm:text-2xl">
                Explore Talibon
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-brand-muted">
              Find your way around the municipality.
            </p>

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
              <button
                type="button"
                onClick={() => setLoadMap(true)}
                aria-describedby="map-privacy-note"
                className="group mt-3 inline-flex min-h-11 items-center gap-2 py-2 text-sm font-semibold text-brand-text transition-colors hover:text-brand-primary"
              >
                <span className="border-b border-current pb-1">Load interactive map</span>
                <ArrowRight size={16} className="text-brand-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </button>
            )}

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 flex min-h-11 w-fit items-center gap-2 py-2 text-sm text-brand-muted underline-offset-4 transition-colors hover:text-brand-text hover:underline"
            >
              Open in Google Maps
              <ExternalLink size={13} aria-hidden="true" />
            </a>
            {!loadMap && (
              <p id="map-privacy-note" className="mt-1 text-xs leading-5 text-brand-muted">
                Loading the map connects to Google.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
