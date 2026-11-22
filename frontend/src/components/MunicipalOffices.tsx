import solidTheme from "../styles/SolidTheme.module.css";
import styles from "./MunicipalOffices.module.css";
import { Link } from "react-router-dom";
import agricultureLogo from "../assets/images/offices/agriculture.png";
import treasuryLogo from "../assets/images/offices/treasury.png";
import planningLogo from "../assets/images/offices/planning.png";
import accountingLogo from "../assets/images/offices/accounting.png";
import employmentLogo from "../assets/images/offices/employment.png";
import marketLogo from "../assets/images/offices/market.png";

const offices = [
  {
    title: "Office of the Municipal Agriculturist",
    category: "Development Office",
    description: "Supports farmers through agricultural programs, modernization, and food security projects.",
    id: "agriculture",
    logo: agricultureLogo,
  },
  {
    title: "Municipal Treasury Office",
    category: "Financial Office",
    description: "Manages municipal financial resources, including revenue collection and disbursements.",
    id: "treasury",
    logo: treasuryLogo,
  },
  {
    title: "Municipal Planning and Development Office",
    category: "Planning Office",
    description: "Formulates development plans and land-use policies for sustainable municipal growth.",
    id: "planning",
    logo: planningLogo,
  },
  {
    title: "Municipal Accounting Office",
    category: "Finance",
    description: "Maintains accurate financial records and ensures accountability in public funds.",
    id: "accounting",
    logo: accountingLogo,
  },
  {
    title: "Municipal Public Employment Service Office",
    category: "Labor Office",
    description: "Provides employment assistance, job matching, and training opportunities for residents.",
    id: "employment",
    logo: employmentLogo,
  },
  {
    title: "Municipal Market Administration Office",
    category: "Market Services",
    description: "Supports the operation and administration of the municipal public market.",
    id: "market",
    logo: marketLogo,
  },
];

export default function MunicipalOffices() {
  return (
    <section id="offices" aria-labelledby="municipal-offices-heading" className={`${solidTheme.section} ${styles.section}`}>
      <div className={`site-container ${styles.layout}`}>
        <div className={styles.intro}>
          <span className={styles.label}>Abante Talibon!</span>
          <h2 id="municipal-offices-heading" className={styles.heading}>Municipal offices and departments</h2>
          <p>Explore the offices serving Talibon and its communities.</p>
        </div>
        <div className={styles.officeGrid}>
          {offices.map(office => (
            <Link key={office.title} to="/executive/directory" data-office-card
              aria-labelledby={`office-${office.id}`}
              className={styles.departmentCard}>
              <div className={styles.departmentHeader}>
                <img src={office.logo} alt={`${office.title} logo`} width={112} height={112}
                  loading="lazy" decoding="async" className={styles.officeLogo} />
                <div className={styles.departmentIdentity}>
                  <h3 id={`office-${office.id}`} className={styles.departmentTitle}>{office.title}</h3>
                  <p className={styles.departmentCategory}>{office.category}</p>
                </div>
              </div>
              <p className={styles.departmentDescription}>{office.description}</p>
              <p className={styles.departmentOfficer}>Official: <span>N/A</span></p>
            </Link>
          ))}
        </div>
        <div className={styles.viewAll}>
          <Link to="/executive/directory" className={styles.button}>View all offices and departments</Link>
        </div>
      </div>
    </section>
  );
}
