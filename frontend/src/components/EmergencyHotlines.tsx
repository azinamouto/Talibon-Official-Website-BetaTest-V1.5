import solidTheme from "../styles/SolidTheme.module.css";
import { motion } from "motion/react";
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
    <section id="emergency" className={`${solidTheme.photo} ${colors.section}`}>
      <div className={colors.watermark} aria-hidden="true">TALIBON</div>

      <div className={`site-container ${colors.container}`}>
        <div className={colors.header}>
          <p className={colors.status}><span aria-hidden="true" />Lines open 24/7</p>
          <h2 className={colors.heading}>Emergency Hotlines</h2>
          <p className={colors.description}>
            Quick response for life-threatening situations. Our emergency teams are available 24/7 to serve the people of Talibon.
          </p>
        </div>

        <div className={colors.grid}>
          {hotlines.map((item, idx) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className={colors.card}
            >
              <div className={colors.cardHeading}>
                <div className={`${item.bgColor} ${item.color}`}>
                  <item.icon size={26} aria-hidden="true" />
                </div>
                <div className={colors.office}>
                  <h3>{item.name}</h3>
                  <p className={colors.agency}>{item.label}</p>
                </div>
              </div>

              <div className={colors.numbers}>
                  {item.numbers.map((num) => (
                    <a 
                      key={num}
                      href={`tel:${num.replace(/-/g, '')}`}
                      aria-label={`Call ${item.name} at ${num}`}
                      className={colors.phone}
                    >
                      <span className={colors.number}>{num}</span>
                      <span className={colors.callLabel}><Phone size={15} aria-hidden="true" />Call</span>
                    </a>
                  ))}
              </div>
            </motion.div>
          ))}
        </div>

        <a href="tel:0385101980" className={colors.landline} aria-label="Call Landline at (038) 510-1980">
          <span>Landline: </span><span className={colors.landlineNumber}>(038) 510-1980</span>
        </a>
      </div>
    </section>
  );
}
