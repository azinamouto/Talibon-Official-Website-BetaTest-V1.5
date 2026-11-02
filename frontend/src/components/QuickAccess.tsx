import { motion } from "motion/react";
import { 
  FileText, 
  FileCheck, 
  CreditCard, 
  Search, 
  Map, 
  Download, 
  BookOpen 
} from "lucide-react";
import { Link } from "react-router-dom";

export default function QuickAccess() {
  const quickLinks = [
    { name: "Permit Information", icon: FileText, href: "/services" },
    { name: "Service Information", icon: FileCheck, href: "/services" },
    { name: "Electronic Services", icon: CreditCard, href: "/e-services" },
    { name: "Tourism Guide", icon: Map, href: "/tourism/spots" },
    { name: "Downloadables", icon: Download, href: "/downloads" },
    { name: "Citizen's Charter", icon: BookOpen, href: "/transparency/charter" },
  ];

  return (
    <section className="py-6 sm:py-8 bg-white border-y border-brand-border">
      <div className="site-container">
        <div className="mx-auto grid w-full max-w-2xl grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6 sm:gap-x-4">
          {quickLinks.map((link, idx) => (
            <motion.div
              key={link.name}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.04 }}
            >
              <Link
                to={link.href}
                className="flex h-full flex-col items-center gap-2 group p-1.5 rounded-xl transition-all duration-300"
              >
                <div className="h-12 w-12 rounded-xl bg-brand-surface shadow-xs border border-brand-border flex items-center justify-center text-brand-primary group-hover:bg-brand-primary group-hover:text-white group-hover:border-brand-primary transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-hover:shadow-brand-primary/20">
                  <link.icon size={20} className="transition-colors" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider text-brand-text group-hover:text-brand-primary transition-colors text-center max-w-24 leading-tight">
                  {link.name}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
