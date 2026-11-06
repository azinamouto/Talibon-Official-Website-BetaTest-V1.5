import OfficeSlideshow from "./OfficeSlideshow";
import solidTheme from "../styles/SolidTheme.module.css";
import styles from "./MunicipalOffices.module.css";
import { Building2, Briefcase, FileText, Calculator, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function MunicipalOffices() {
  const offices = [
    {
      title: "Office of the Municipal Mayor",
      officer: "Hon. Michael I. Doria",
      icon: Building2,
      color: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      badgeTextColor: "text-emerald-800 dark:text-emerald-300",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      accentColor: "bg-emerald-600 dark:bg-emerald-500",
      boxBg: "bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800"
    },
    {
      title: "Municipal Planning & Development Coordinator",
      officer: "Elmer B. Magalona",
      icon: Briefcase,
      color: "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400",
      borderColor: "border-blue-200 dark:border-blue-800",
      badgeTextColor: "text-blue-800 dark:text-blue-300",
      iconColor: "text-blue-600 dark:text-blue-400",
      accentColor: "bg-blue-600 dark:bg-blue-500",
      boxBg: "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800"
    },
    {
      title: "Office of the Municipal Local Civil Registrar",
      officer: "Juliet D. Lumbo-an",
      icon: FileText,
      color: "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400",
      borderColor: "border-sky-200 dark:border-sky-800",
      badgeTextColor: "text-sky-800 dark:text-sky-300",
      iconColor: "text-sky-600 dark:text-sky-400",
      accentColor: "bg-sky-600 dark:bg-sky-500",
      boxBg: "bg-white dark:bg-slate-900 border-sky-200 dark:border-sky-800"
    },
    {
      title: "Office of the Municipal Budget Officer",
      officer: "Rogelia L. Cellan",
      icon: Calculator,
      color: "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400",
      borderColor: "border-purple-200 dark:border-purple-800",
      badgeTextColor: "text-purple-800 dark:text-purple-300",
      iconColor: "text-purple-600 dark:text-purple-400",
      accentColor: "bg-purple-600 dark:bg-purple-500",
      boxBg: "bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800"
    }
  ];

  return (
    <section id="offices" aria-labelledby="municipal-offices-heading" className={`${solidTheme.section} ${styles.section}`}>
      <div className="site-container">
        <div className={styles.intro}>
          <span className={styles.label}>Abante Talibon!</span>
          <h2 id="municipal-offices-heading" className={styles.heading}>Municipal offices and departments</h2>
          <p>Dedicated public servants committed to excellence and transparency in local governance.</p>
        </div>

        <OfficeSlideshow>
          {offices.map((office, idx) => (
            <Link key={office.title} to="/executive/directory" data-office-card
              aria-label={`${office.title} ${office.officer}`}
              className={styles.card}>
              <div className={styles.band}>
                <office.icon className="icon-float" size={44} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div className={styles.body}>
                <h3 className={styles.title}>{office.title}</h3>
                <p className={styles.name}>{office.officer}</p>
                <div className={styles.bottom}>
                  <span className={styles.pill}>{idx === 0 ? 'Municipal Mayor' : 'Department head'}</span>
                  <span className={styles.arrow} aria-hidden="true"><ArrowRight size={20} aria-hidden="true" /></span>
                </div>
              </div>
            </Link>
          ))}
        </OfficeSlideshow>

        <div className={styles.viewAll}>
          <Link to="/executive/directory" className={styles.button}>
            View all offices and departments <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
