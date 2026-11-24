import { CloudSun, Waves } from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./WeatherWidget.module.css";

export default function WeatherWidget() {
  return (
    <aside id="weather" aria-labelledby="sandbar-weather-heading" className={styles.panel}>
      <div className={styles.heading}>
        <CloudSun size={26} strokeWidth={1.6} aria-hidden="true" />
        <h4 id="sandbar-weather-heading">Weather &amp; tides</h4>
      </div>
      <p className={styles.intro}>A little planning for your sandbar visit.</p>
      <div className={styles.conditions}>
        <div>
          <CloudSun size={18} strokeWidth={1.7} aria-hidden="true" />
          <p><strong>Before you go</strong><span>Check the latest local weather advisories.</span></p>
        </div>
        <div>
          <Waves size={18} strokeWidth={1.7} aria-hidden="true" />
          <p><strong>Time your visit</strong><span>Ask your boat operator about tide times.</span></p>
        </div>
      </div>
      <Link to="/news/advisories" className={styles.link}>View public advisories</Link>
    </aside>
  );
}
