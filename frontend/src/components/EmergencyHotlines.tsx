import solidTheme from "../styles/SolidTheme.module.css";
import { motion } from "motion/react";
import compact from "./CompactSections.module.css";
import colors from "./EmergencyHotlines.module.css";
import { Phone, ShieldAlert, HeartPulse, Flame, Siren } from "lucide-react";

export default function EmergencyHotlines() {
  const hotlines = [
    {
      name: "MDRRMO",
      label: "Municipal Disaster Risk Reduction & Management Office",
      numbers: ["0929-152-3330", "0917-323-0117"],
      icon: Siren,
      color: colors.icon,
      bgColor: colors.iconChip
    },
    {
      name: "PNP Station",
      label: "Talibon Municipal Police Station",
      numbers: ["0998-598-6433"],
      icon: ShieldAlert,
      color: colors.icon,
      bgColor: colors.iconChip
    },
    {
      name: "Rural Health Unit",
      label: "24/7 Emergency Medical Services",
      numbers: ["0946-336-0021"],
      icon: HeartPulse,
      color: colors.icon,
      bgColor: colors.iconChip
    },
    {
      name: "BFP Station",
      label: "Bureau of Fire Protection - Talibon",
      numbers: ["0945-862-7931"],
      icon: Flame,
      color: colors.icon,
      bgColor: colors.iconChip
    }
  ];

  return (
    <section id="emergency" className={`${solidTheme.photo} ${compact.emergency} ${colors.section} relative overflow-hidden`}>
      {/* Background Text - Embossment */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black text-white/[0.02] select-none pointer-events-none leading-none font-display tracking-tighter uppercase whitespace-nowrap">
        TALIBON
      </div>
      {/* Decorative background elements */}
      <div className={`${colors.glow} absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2`} />
      <div className={`${colors.glow} absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2`} />

      <div className="site-container relative z-10">
        <div className={compact.emergencyHeader}>
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight font-display">Emergency Hotlines<span className={colors.emoji} role="img" aria-label="Siren">🚨</span></h2>
          <p className={`${colors.description} font-normal text-base max-w-2xl mx-auto`}>
            Quick response for life-threatening situations. Our emergency teams are available 24/7 to serve the people of Talibon.
          </p>
        </div>

        <div className={compact.hotlineGrid}>
          {hotlines.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={`${compact.hotlineCard} ${colors.card} bg-white/5 border backdrop-blur-sm hover:bg-white/10 transition-all duration-500 group`}
            >
              <div className={`${compact.hotlineIcon} ${item.bgColor} flex items-center justify-center ${item.color} transition-transform group-hover:scale-110 duration-500`}>
                <item.icon size={28} />
              </div>
              
              <div className={compact.hotlineContent}>
                <div className={compact.agency}>
                  <h3 className="text-xl font-bold text-white mb-1 font-display uppercase tracking-tight">{item.name}</h3>
                  <p className={`${colors.agency} text-[10px] font-bold uppercase tracking-widest leading-tight`}>{item.label}</p>
                </div>
                
                <div className={compact.numbers}>
                  {item.numbers.map((num) => (
                    <a 
                      key={num}
                      href={`tel:${num.replace(/-/g, '')}`}
                      className={`${compact.call} ${colors.phone} flex items-center gap-3 text-white transition-colors group/link`}
                    >
                      <div className={`${colors.phoneChip} w-8 h-8 rounded-xl flex items-center justify-center transition-colors`}>
                        <Phone size={14} />
                      </div>
                      <span className="text-sm font-bold tracking-widest">{num}</span>
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={`${compact.landline} ${colors.landline} border text-center`}>
          <p className="text-white font-bold text-xs tracking-[0.2em] uppercase">
            Landline: (038) 510-1980
          </p>
        </div>
      </div>
    </section>
  );
}
