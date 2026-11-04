import solidTheme from "../styles/SolidTheme.module.css";
import SocialMediaUpdates from "./SocialMediaUpdates";
import Location from "./Location";
import styles from "./ConnectWithTalibon.module.css";

export default function ConnectWithTalibon() {
  return <section id="connect-talibon" aria-labelledby="social-updates-heading" className={`${solidTheme.section} ${styles.section}`}>
    <div className="site-container">
      <div className={styles.heading}>
        <p>Stay connected</p>
        <h2 id="social-updates-heading">Connect with Talibon</h2>
        <p className={styles.introduction}>Get news from the municipal government and find your way to Municipal Hall.</p>
      </div>
      <div className={styles.columns}><SocialMediaUpdates /><Location /></div>
    </div>
  </section>;
}
