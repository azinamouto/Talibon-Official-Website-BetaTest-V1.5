import solidTheme from "../styles/SolidTheme.module.css";
import { useState } from "react";
import compact from "./CompactSections.module.css";
import { Clock3, MapPin, Navigation, X } from "lucide-react";
import { Link } from "react-router-dom";

const destination = "Talibon Municipal Hall, Poblacion, Talibon, Bohol, Philippines";

export default function Location() {
  const [loadMap, setLoadMap] = useState(false);
  return (
    <section id="location" aria-labelledby="location-heading" className={`${solidTheme.section} ${compact.location} scroll-mt-40 bg-surface`}>
      <div className="site-container">
        <div className={`${compact.locationCard} overflow-hidden rounded-xl border border-brand-border bg-brand-surface`}>
          <div className={`${compact.map} relative bg-[#dcebf0]`}>
            <img src={`${import.meta.env.BASE_URL}images/talibon-map.svg`} alt="Street map of Talibon town centre, with a pin at the Municipal Hall on Carlos P. Garcia Avenue." width="960" height="600" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
            {loadMap ? <>
              <iframe id="talibon-interactive-map" src={`https://www.google.com/maps?q=${encodeURIComponent(destination)}&output=embed`} className="absolute inset-0 h-full w-full border-0" allowFullScreen referrerPolicy="no-referrer-when-downgrade" title="Google Maps — Talibon Municipal Hall" />
              <button type="button" onClick={() => setLoadMap(false)} className="ui-focus absolute right-4 top-4 inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-border bg-white px-3 text-sm font-semibold text-ink shadow-sm hover:bg-surface active:bg-surface"><X size={16} aria-hidden="true" />Close map</button>
            </> : <>
              <div className="absolute bottom-12 left-4 right-4 flex flex-col items-start gap-2 sm:left-6">
                <button type="button" onClick={() => setLoadMap(true)} aria-describedby="map-privacy-note" className="ui-focus inline-flex min-h-11 items-center gap-2 rounded-lg border border-brand-border bg-white px-4 py-3 text-sm font-semibold text-ink shadow-sm transition-colors hover:bg-surface active:bg-surface"><MapPin size={18} className="text-action" aria-hidden="true" />Open interactive map</button>
                <p id="map-privacy-note" className="rounded bg-white/95 px-2 py-1 text-xs text-muted">Opens a map from Google.</p>
              </div>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="ui-focus absolute bottom-0 right-0 inline-flex min-h-11 items-center bg-white/95 px-3 text-xs text-muted underline hover:text-action">© OpenStreetMap contributors</a>
            </>}
          </div>
          <div className={`${compact.locationInfo} flex flex-col justify-center`}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-action">Find us</p>
            <h2 id="location-heading" className="font-display text-2xl font-bold text-ink sm:text-3xl">Visit Municipal Hall</h2>
            <p className="mt-2 leading-7 text-muted">Your local government, in the heart of Talibon.</p>
            <address className="mt-4 flex gap-3 text-sm not-italic leading-6 text-ink"><MapPin size={20} className="mt-1 shrink-0 text-action" aria-hidden="true" /><span>Municipal Hall, Poblacion<br />Talibon, Bohol, 6325, Philippines</span></address>
            <div className="mt-3 flex gap-3 text-sm leading-6"><Clock3 size={20} className="mt-1 shrink-0 text-action" aria-hidden="true" /><div><p className="font-semibold text-ink">Office hours</p><p className="text-muted">Confirm current hours before your visit.</p><Link to="/executive/directory" className="ui-focus inline-flex min-h-11 items-center rounded font-medium text-action underline-offset-4 hover:underline active:text-action-hover">Contact the municipal offices</Link></div></div>
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer" className="ui-focus mt-4 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-lg bg-action px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-action-hover active:bg-action-hover"><Navigation size={18} aria-hidden="true" />Get directions</a>
          </div>
          <dl className={`${compact.locationFacts} grid border-t border-brand-border sm:grid-cols-3`}>
            {[
              { label: "Municipality coordinates", value: "10.12°N, 124.28°E" },
              { label: "Land area", value: "140.46 km²" },
              { label: "From Tagbilaran City", value: "114.8 km" },
            ].map(({ label, value }) => <div key={label} className={`${compact.locationFact} max-sm:border-b max-sm:border-brand-border last:border-0 sm:border-r sm:border-brand-border`}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 text-base font-semibold text-ink">{value}</dd></div>)}
          </dl>
        </div>
      </div>
    </section>
  );
}
