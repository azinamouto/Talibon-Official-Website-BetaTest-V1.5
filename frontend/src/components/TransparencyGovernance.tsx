import solidTheme from "../styles/SolidTheme.module.css";
import { motion, useReducedMotion } from "motion/react";
import styles from "./TransparencyGovernance.module.css";
import { FileText, BarChart3, ClipboardList, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function TransparencyGovernance() {
  const reducedMotion = useReducedMotion();
  const items = [
    {
      title: "Annual Budget",
      desc: "Approved annual budget documents, appropriation ordinances, and budget allocation summaries.",
      icon: BarChart3,
      href: "/transparency/budget"
    },
    {
      title: "Bids & Public Offerings",
      desc: "Invitation to bid, abstracts of bids, notices of award, and approved contract documents.",
      icon: ClipboardList,
      href: "/transparency/biddings"
    },
    {
      title: "Annual Procurement Plan",
      desc: "Consolidated annual procurement plan and updates, including all procurement activities.",
      icon: FileText,
      href: "/transparency/disclosure"
    },
    {
      title: "Full Disclosure Policy",
      desc: "Compliance documents and reports under the DILG Full Disclosure Policy and SGLG.",
      icon: ShieldCheck,
      href: "/transparency/disclosure"
    }
  ];

  return (
    <section id="transparency" aria-labelledby="transparency-title" className={`${solidTheme.section} ${styles.section}`}>
      <div className="site-container">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}><ShieldCheck size={18} aria-hidden="true" />Good governance and compliance</p>
            <h2 id="transparency-title">Transparency and accountability</h2>
            <p className={styles.description}>We are committed to open governance. Access official reports, budget allocations, and procurement activities of the Municipal Government of Talibon.</p>
          </div>
          <div className={styles.seals}>
            <div className={styles.seal}><img src="https://upload.wikimedia.org/wikipedia/en/thumb/0/0d/Philippine_Transparency_Seal.svg/960px-Philippine_Transparency_Seal.svg.png" alt="Transparency Seal" referrerPolicy="no-referrer" /></div>
            <div className={styles.seal}><img src="https://ncda.gov.ph/wp-content/uploads/2023/06/freedom-of-information-logo.jpg" alt="FOI" referrerPolicy="no-referrer" /></div>
          </div>
        </header>
        <ul className={`${styles.grid} icon-float-group`} aria-label="Transparency documents">
          {items.map((item, idx) => {
            const titleId = `transparency-document-${idx}`;
            const actionId = `${titleId}-action`;
            return <motion.li key={item.title} className={styles.card}
              initial={reducedMotion ? false : { opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: reducedMotion ? 0 : idx * 0.08 }}>
              <span className={styles.icon}><item.icon className="icon-float" size={28} aria-hidden="true" /></span>
              <h3 id={titleId}>{item.title}</h3>
              <p>{item.desc}</p>
              <Link id={actionId} to={item.href} aria-labelledby={`${titleId} ${actionId}`} className={styles.action}>
                View documents <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            </motion.li>;
          })}
        </ul>
        <div className={styles.footerLogos}>
          <div className={styles.footerLogo}><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Bagong_Pilipinas_logo.png/1920px-Bagong_Pilipinas_logo.png" alt="Bagong Pilipinas" referrerPolicy="no-referrer" /></div>
          <div className={styles.footerLogo}><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/af/Seal_of_the_Philippines.svg/1280px-Seal_of_the_Philippines.svg.png" alt="PH Seal" referrerPolicy="no-referrer" /></div>
        </div>
      </div>
    </section>
  );
}
