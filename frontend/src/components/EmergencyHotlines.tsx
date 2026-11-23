import solidTheme from "../styles/SolidTheme.module.css";
import colors from "./EmergencyHotlines.module.css";
import { Phone, ShieldAlert, HeartPulse, Flame, Siren } from "lucide-react";

export default function EmergencyHotlines() {
  const hotlines = [
    {
      name: "MDRRMO",
      label: "Municipal Disaster Risk Reduction & Management Office",
      subtitle: "Disaster Risk Reduction",
      numbers: ["0929-152-3330", "0917-323-0117"],
      icon: Siren,
      color: colors.icon,
      bgColor: colors.iconChip
    },
    {
      name: "PNP Station",
      label: "Talibon Municipal Police Station",
      subtitle: "Municipal Police",
      numbers: ["0998-598-6433"],
      icon: ShieldAlert,
      color: colors.icon,
      bgColor: colors.iconChip
    },
    {
      name: "Rural Health Unit",
      label: "24/7 Emergency Medical Services",
      subtitle: "Emergency Medical Services",
      numbers: ["0946-336-0021"],
      icon: HeartPulse,
      color: colors.icon,
      bgColor: colors.iconChip
    },
    {
      name: "BFP Station",
      label: "Bureau of Fire Protection - Talibon",
      subtitle: "Fire Protection",
      numbers: ["0945-862-7931"],
      icon: Flame,
      color: colors.icon,
      bgColor: colors.iconChip
    }
  ];

  return (
    <section id="emergency" className={`${solidTheme.photo} ${colors.section}`}>

      <div className={`site-container ${colors.container}`}>
        <div className={colors.header}>
          <p className={colors.status}><span aria-hidden="true" />Lines open 24/7</p>
          <div className={colors.headingRow}>
            <h2 className={colors.heading}>Emergency hotlines</h2>
            <a href="tel:0385101980" className={colors.landline} aria-label="Call Landline at (038) 510-1980">
              <Phone size={16} aria-hidden="true" />Landline (038) 510-1980
            </a>
          </div>
        </div>

        <div className={colors.grid}>
          {hotlines.map(item => (
            <article key={item.name} className={colors.card} title={item.label} aria-label={item.label}>
              <div className={colors.cardHeading}>
                <div className={`${item.bgColor} ${item.color}`}>
                  <item.icon size={20} aria-hidden="true" />
                </div>
                <div className={colors.office}>
                  <h3>{item.name}</h3>
                  <p className={colors.agency}>{item.subtitle}</p>
                </div>
              </div>

              <div className={colors.numbers}>
                  {item.numbers.map((num) => (
                    <a 
                      key={num}
                      href={`tel:${num.replace(/\D/g, '')}`}
                      aria-label={`Call ${item.name} at ${num}`}
                      className={colors.phone}
                    >
                      <span className={colors.number}>{num}</span>
                      <Phone size={16} aria-hidden="true" />
                    </a>
                  ))}
              </div>
            </article>
          ))}
        </div>

      </div>
    </section>
  );
}
