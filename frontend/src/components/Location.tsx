import { ArrowRight, Clock3, ExternalLink, MapPin, Route, Scan } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./ConnectWithTalibon.module.css";
import { SERVICES_DATA } from "../data/servicesData";

const destination = "Talibon Municipal Hall, Poblacion, Talibon, Bohol, Philippines";
const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(destination)}`;

export default function Location() {
  return (
    <aside id="location" aria-labelledby="location-heading" className={styles.mapCard}>
      <div id="talibon-map" className={styles.mapFrame}>
        <iframe id="talibon-interactive-map" src={`${mapsUrl}&output=embed`} className={styles.map} loading="eager"
          referrerPolicy="no-referrer-when-downgrade" title={"Google Maps — Talibon Municipal Hall"} tabIndex={-1} />
        <div className={styles.explore}>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={`${styles.button} ${styles.exploreButton}`}>
            <ExternalLink size={18} aria-hidden="true" />Open in Maps<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
      <div className={styles.infoPanel} data-location-panel>
        <p className={styles.findUs}>Find us</p>
        <h3 id="location-heading">Visit Municipal Hall</h3>
        <address className={styles.infoRow}>
          <span className={styles.rowIcon}><MapPin size={22} aria-hidden="true" /></span>
          <span><span className={styles.factLabel}>Address</span><strong>Municipal Hall, Poblacion</strong><br />Talibon, Bohol, 6325, Philippines</span>
        </address>
        <div className={styles.infoRow}>
          <span className={styles.rowIcon}><Clock3 size={22} aria-hidden="true" /></span>
          <div><p className={styles.hoursTitle}>Office hours</p><div className={styles.hoursLine}><p>{SERVICES_DATA["apply-permit"].officeHours}</p>
            <Link to="/executive/directory" className={styles.contact}>Contact the municipal offices</Link></div>
          </div>
        </div>
        <div className={styles.facts}>
          <span><MapPin size={16} aria-hidden="true" />Coordinates: 10.12&#176;N, 124.28&#176;E</span>
          <span><Route size={16} aria-hidden="true" />114.8 km from Tagbilaran</span>
          <span><Scan size={16} aria-hidden="true" />140.46 km&#178; land area</span>
        </div>
        <div className={styles.mapActions}>
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`} target="_blank" rel="noopener noreferrer" className={`${styles.button} ${styles.primary}`}>
            Get directions<ArrowRight size={18} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <p className={styles.mapCredit}>Map data &#169; Google</p>
      </div>
    </aside>
  );
}
