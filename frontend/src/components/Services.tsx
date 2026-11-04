import solidTheme from "../styles/SolidTheme.module.css";
import styles from "./Services.module.css";
import { motion } from "motion/react";
import { 
  FileText, 
  CreditCard, 
  Users, 
  HeartPulse, 
  GraduationCap, 
  Building2, 
  ArrowUpRight, 
  Sprout, 
  ShieldCheck,
  Smartphone,
  Globe,
  Search
} from "lucide-react";
import { Link } from "react-router-dom";

export default function Services() {
  const services = [
    {
      icon: FileText,
      title: "Business Permits",
      description: "Online services are to be implemented. Please visit the appropriate municipal office.",
      href: "/forms/business",
      iconColor: "text-sky-400"
    },
    {
      icon: CreditCard,
      title: "Real Property Tax",
      description: "View published finance information.",
      href: "/transparency/finance",
      iconColor: "text-sky-400"
    },
    {
      icon: Users,
      title: "Civil Registry",
      description: "Request birth, marriage, and death certificates.",
      href: "/executive/directory",
      iconColor: "text-sky-400"
    },
    {
      icon: Building2,
      title: "Building Permits",
      description: "Visit the appropriate municipal office for building permit assistance.",
      href: "/forms/building",
      iconColor: "text-sky-400"
    },
    {
      icon: HeartPulse,
      title: "Health Services",
      description: "Public health programs and assistance.",
      href: "/executive/directory",
      iconColor: "text-emerald-400"
    },
    {
      icon: Sprout,
      title: "Agriculture",
      description: "Support for farmers and fisherfolk.",
      href: "/executive/directory",
      iconColor: "text-sky-400"
    }
  ];

  return (
    <section 
      id="services" 
      className={`${solidTheme.section} ${styles.section} relative py-14 sm:py-20 text-white overflow-hidden`}
    >
      <div className="site-container relative z-10">
        <div className="text-center mb-10 sm:mb-12">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-white">
              MUNICIPAL SERVICES & REAL ESTATE
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display">
            Digital Governance
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-xl mx-auto mt-1.5 leading-relaxed drop-shadow-2xs">
            Streamlining public services through innovation. Access essential municipal functions directly from your device.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {services.map((service, idx) => (
            <motion.div
              key={service.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
              className={`${styles.card} group relative overflow-hidden rounded-2xl p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between hover:-translate-y-1`}
            >
              <div className="space-y-3.5">
                <div className={`${styles.icon} w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105`}>
                  <service.icon aria-hidden="true" size={20} className={service.iconColor} />
                </div>
                
                <div>
                  <h3 className="text-base font-bold mb-1 tracking-tight font-display">
                    {service.title}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed">
                    {service.description}
                  </p>
                </div>
              </div>

              <Link 
                to={service.href}
                className={`${styles.action} mt-4 inline-flex items-center gap-1.5 font-bold transition-all group-hover:gap-2`}
              >
                <span>Learn More</span>
                <ArrowUpRight aria-hidden="true" size={13} />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}


