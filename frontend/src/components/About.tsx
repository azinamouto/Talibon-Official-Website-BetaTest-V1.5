import solidTheme from "../styles/SolidTheme.module.css";
import { Link } from "react-router-dom";
import styles from "./About.module.css";
import { useRef, type CSSProperties } from "react";
import { useInView } from "motion/react";

export default function About() {
  const sectionRef = useRef<HTMLElement>(null);
  const valuesRef = useRef<HTMLDListElement>(null);
  const entered = useInView(sectionRef, { once: true, amount: 0.08 });
  const valuesEntered = useInView(valuesRef, { once: true, amount: 0.25 });
  const welcome = "Dajon kamo sa atong matahum nga Talibon!";
  const welcomeWords = welcome.split(" ");
  const heritageBgImg = `${import.meta.env.BASE_URL}images/heritage-coast.jpg`;

  return (
    <section ref={sectionRef} id="about" aria-labelledby="our-story-heading"
      data-welcome-entered={entered}
      className={`${solidTheme.photo} ${styles.section} mayor-message`}>
      <style>{`
        #root #about.mayor-message {
          position: relative;
          width: 100%;
          overflow: hidden;
          padding: 72px var(--site-gutter) 0 !important;
          color: white;
        }
        #root #about .mayor-content { position: relative; z-index: 1; width: 100%; min-width: 0; }
        #root #about .mayor-grid { display: grid; grid-template-columns: minmax(0, 380px) minmax(0, 1fr); gap: clamp(32px, 5vw, 64px); align-items: start; }
        #root #about .mayor-profile { min-width: 0; margin: 0; }
        #root #about .mayor-portrait { position: relative; aspect-ratio: 4 / 5; }
        #root #about .mayor-photo { display: block; width: 100%; height: 100%; object-fit: cover; object-position: center top; border: 3px solid color-mix(in srgb, white 88%, transparent); border-radius: 50% 50% 14px 14px; }
        #root #about .mayor-seal { position: absolute; right: -12px; bottom: 18px; width: 76px; height: 76px; object-fit: contain; border: 3px solid white; border-radius: 50%; background: white; }
        #root #about .mayor-nameplate { margin-top: 24px; border-left-width: 4px; border-left-style: solid; padding-left: 14px; }
        #root #about .mayor-name { margin: 0; color: white; font-family: Georgia, "Times New Roman", serif; font-size: 24px !important; font-weight: 500 !important; line-height: 1.25 !important; }
        #root #about .mayor-title { margin: 6px 0 0; color: var(--color-dark-muted); font-size: 14px; line-height: 1.6; }
        #root #about #our-story-heading { margin: 0 0 30px; color: white; font-family: Georgia, "Times New Roman", serif; font-size: clamp(30px, 3.3vw, 44px) !important; font-weight: 500 !important; line-height: 1.12 !important; }
        #root #about .mayor-copy { min-width: 0; }
        #root #about .mayor-paragraphs { max-width: 62ch; font-family: Georgia, "Times New Roman", serif; font-size: clamp(18px, 1.5vw, 20px); line-height: 1.7; color: var(--color-slate-200); }
        #root #about .mayor-paragraphs p { margin: 0 0 22px; }
        #root #about .mayor-paragraphs .mayor-lead { color: white; font-size: clamp(19px, 1.6vw, 21px); }
        #root #about .mayor-signoff { margin-top: 30px; padding-top: 24px; border-top: 1px solid transparent; }
        #root #about .mayor-quote { margin: 0 0 24px; color: white; font-family: Georgia, "Times New Roman", serif; font-size: clamp(26px, 2.9vw, 38px); font-style: italic; line-height: 1.3; }
        #root #about .mayor-history { display: inline-block; padding-bottom: 4px; color: white; font-size: 16px; font-weight: 600; line-height: 1.6; text-decoration: none; }
        #root #about .mayor-history:hover { text-decoration: underline; text-underline-offset: 4px; }
        #root #about .mayor-history:focus-visible { outline: 3px solid white; outline-offset: 4px; }
        #root #about .mayor-values { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 64px 0 0; border-top: 1px solid color-mix(in srgb, white 18%, transparent); }
        #root #about .mayor-value { padding: 28px 36px 36px 0; }
        #root #about .mayor-value + .mayor-value { padding-left: 36px; padding-right: 0; border-left: 1px solid color-mix(in srgb, white 18%, transparent); }
        #root #about .mayor-value dt { display: flex; align-items: center; gap: 10px; color: white; font-size: 16px; font-weight: 600; line-height: 1.5; }
        #root #about .mayor-marker { flex: none; width: 10px; height: 10px; border-radius: 50%; }
        #root #about .mayor-value dd { max-width: 44ch; margin: 8px 0 0; color: var(--color-dark-muted); font-size: 15px; line-height: 1.6; }
        @media (max-width: 759px) {
          #root #about .mayor-grid { grid-template-columns: minmax(0, 1fr); gap: 40px; }
          #root #about .mayor-profile { width: 100%; max-width: 300px; margin-inline: auto; }
          #root #about .mayor-values { grid-template-columns: minmax(0, 1fr); }
          #root #about .mayor-value { padding: 28px 0 36px; }
          #root #about .mayor-value + .mayor-value { padding: 28px 0 36px; border-left: 0; border-top: 1px solid color-mix(in srgb, white 18%, transparent); }
        }
      `}</style>
      <img src={heritageBgImg} alt="" loading="lazy" width="2000" height="1330" className={styles.background} />
      <div className={`${styles.overlay} absolute inset-0 z-0 pointer-events-none`} />
      <div className="mayor-content">
        <div className="mayor-grid">
          <figure className="mayor-profile">
            <div className="mayor-portrait">
              <img src={`${import.meta.env.BASE_URL}images/mayor-janette.webp`}
                alt="Mayor Janette Aurestila-Garcia" loading="lazy" className="mayor-photo" />
              <img src={`${import.meta.env.BASE_URL}images/talibon-official-seal.png`}
                alt="Municipal seal of Talibon" loading="lazy" width="76" height="76" className="mayor-seal" />
            </div>
            <figcaption className="mayor-nameplate border-rose-900">
              <p className="mayor-name">Hon. Janette Aurestila-Garcia</p>
              <p className="mayor-title">Municipal Mayor of Talibon, Bohol</p>
            </figcaption>
          </figure>
          <div className="mayor-copy">
            <h2 id="our-story-heading">A message from the Mayor</h2>
            <div className="mayor-paragraphs">
              <p className="mayor-lead">As the home of the late President Carlos P. Garcia, we carry a legacy of greatness.</p>
              <p>As Bohol's Seafood Capital, we invite you to experience the bounty of our seas and the warmth of our community.</p>
              <p>Together, let us continue to build a brighter, more prosperous future for every Talibongnon.</p>
            </div>
            <div className="mayor-signoff">
              <p className="mayor-quote">
                <span className="sr-only">{welcome}</span>
                <span aria-hidden="true">{welcomeWords.map((word, index) => (
                  <span key={`${word}-${index}`}><span className="mayor-word" style={{ "--word-order": index } as CSSProperties}>{word}</span>{index < welcomeWords.length - 1 ? " " : ""}</span>
                ))}</span>
              </p>
              <Link to="/about/history" className="mayor-history border-green-600">Read Talibon's history <span className="mayor-link-arrow" aria-hidden="true">&rarr;</span></Link>
            </div>
          </div>
        </div>
        <dl ref={valuesRef} className="mayor-values" data-values-entered={valuesEntered}>
          <div className="mayor-value">
            <dt><span className="mayor-marker bg-blue-600" aria-hidden="true" />Vision</dt>
            <dd>To be a premier center of commerce and eco-tourism in Northern Bohol.</dd>
          </div>
          <div className="mayor-value">
            <dt><span className="mayor-marker bg-green-600" aria-hidden="true" />Mission</dt>
            <dd>Empowering citizens through sustainable development and digital governance.</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

