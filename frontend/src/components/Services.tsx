import { Building2, CreditCard, FileText, HeartPulse, Sprout, Users } from "lucide-react";
import { Link } from "react-router-dom";

type ServiceStatus = "online" | "soon" | "office";

export default function Services() {
  const services: {
    icon: typeof Users;
    title: string;
    description: string;
    href: string;
    action: string;
    status: ServiceStatus;
  }[] = [
    { icon: Users, title: "Civil registry", description: "Request birth, marriage and death certificates.", href: "/executive/directory", action: "Request a certificate", status: "online" },
    { icon: CreditCard, title: "Real property tax", description: "View published finance information.", href: "/transparency/finance", action: "View information", status: "online" },
    { icon: FileText, title: "Business permits", description: "Online application is not ready yet. Please apply at the municipal office.", href: "/forms/business", action: "See what to bring", status: "soon" },
    { icon: Building2, title: "Building permits", description: "Get building permit help at the municipal office.", href: "/forms/building", action: "Find the office", status: "office" },
    { icon: HeartPulse, title: "Health services", description: "Public health programs and assistance.", href: "/executive/directory", action: "See programs", status: "online" },
    { icon: Sprout, title: "Agriculture", description: "Support for farmers and fisherfolk.", href: "/executive/directory", action: "Get support", status: "online" },
  ];
  const statusLabels: Record<ServiceStatus, string> = {
    online: "online", soon: "soon", office: "at the hall",
  };

  return (
    <section id="services" aria-labelledby="services-heading" className="digital-services">
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Inter:wght@400;600&family=Newsreader:wght@500&display=swap" />
      <style>{`
        #root #services.digital-services {
          --dg-seafoam: #eef4f1;
          --dg-ink: #0a3a63;
          --dg-heading: #0a2c4a;
          --dg-body: #3d4b5c;
          --dg-green: #2a7d51;
          --dg-amber: #b7791f;
          --dg-maroon: #7a1f33;
          --dg-blue: #0b5fa8;
          padding: 0 !important;
          background: var(--dg-seafoam);
          color: var(--dg-body);
          font-family: "Inter", sans-serif;
        }
        #root #services .dg-wave { display: block; width: 100%; height: 56px; }
        #root #services .dg-content { padding: 36px var(--site-gutter) 72px; }
        #root #services .dg-inner { width: 100%; min-width: 0; }
        #root #services .dg-header { display: grid; grid-template-columns: 1.15fr 1fr; align-items: end; gap: 48px; margin-bottom: 48px; }
        #root #services #services-heading { margin: 0; font-family: "Newsreader", Georgia, serif; font-size: clamp(34px, 4.5vw, 60px) !important; font-weight: 500 !important; line-height: 1.05 !important; letter-spacing: -0.015em !important; color: var(--dg-heading); }
        #root #services .dg-underline { display: block; width: min(340px, 100%); height: 14px; margin-top: 20px; overflow: visible; }
        #root #services .dg-summary { max-width: 40ch; margin: 0; font-size: 17px; line-height: 1.65; }
        #root #services .dg-note { margin: 18px 0 0; font-family: "Caveat", cursive; font-size: 26px; font-weight: 500; line-height: 1.3; color: var(--dg-maroon); transform: rotate(-2deg); }
        #root #services .dg-grid { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 26px 24px; }
        #root #services .dg-tile { --dg-tilt: -0.6deg; position: relative; display: flex; flex-direction: column; gap: 10px; grid-column: span 3; min-width: 0; padding: 24px 26px 22px; background: white; border: 2px solid var(--dg-ink); border-radius: 255px 14px 225px 14px / 14px 225px 14px 255px; box-shadow: 5px 6px 0 var(--dg-ink); color: var(--dg-body); text-decoration: none; transform: rotate(var(--dg-tilt)); transition: transform 150ms, box-shadow 150ms; }
        #root #services .dg-tile:first-child { grid-column: span 4; }
        #root #services .dg-tile:nth-child(2) { grid-column: span 2; --dg-tilt: 0.7deg; }
        #root #services .dg-tile:nth-child(3) { --dg-tilt: 0.4deg; }
        #root #services .dg-tile:nth-child(4) { --dg-tilt: -0.5deg; }
        #root #services .dg-tile:nth-child(5) { --dg-tilt: 0.5deg; }
        #root #services .dg-tile:nth-child(6) { --dg-tilt: -0.4deg; }
        #root #services .dg-icon { flex: none; margin-bottom: 4px; color: var(--dg-blue); }
        #root main #services:not(#home):not(#weather) .dg-tile-title { margin: 0; font-family: "Newsreader", Georgia, serif; font-size: 26px !important; font-weight: 500 !important; line-height: 1.2 !important; color: var(--dg-heading); }
        #root main #services:not(#home):not(#weather) .dg-tile:first-child .dg-tile-title { font-size: 34px !important; }
        #root #services .dg-description { max-width: 46ch; margin: 0 0 10px; font-size: 15px; line-height: 1.55; }
        #root #services .dg-action { align-self: flex-start; margin-top: auto; color: var(--dg-ink); font-size: 15px; font-weight: 600; line-height: 1.6; background-image: linear-gradient(var(--dg-green), var(--dg-green)); background-position: left bottom; background-size: 100% 2px; background-repeat: no-repeat; }
        #root #services .dg-stamp { position: absolute; top: 18px; right: 22px; padding: 0 12px 2px; border: 2px solid currentColor; border-radius: 8px 4px 9px 5px; background: white; color: var(--dg-green); font-family: "Caveat", cursive; font-size: 21px; font-weight: 600; line-height: 1.3; transform: rotate(5deg); }
        #root #services .dg-stamp[data-status="soon"] { color: var(--dg-amber); transform: rotate(-4deg); }
        #root #services .dg-stamp[data-status="office"] { color: var(--dg-maroon); transform: rotate(3deg); }
        #root #services .dg-footer { margin: 44px 0 0; }
        #root #services .dg-directory { display: inline-block; border-bottom: 2px solid var(--dg-green); color: var(--dg-ink); font-size: 16px; font-weight: 600; line-height: 1.6; text-decoration: none; }
        #root #services :is(.dg-tile, .dg-directory):focus-visible { outline: 3px solid var(--dg-blue); outline-offset: 5px; }
        @media (hover: hover) {
          #root #services .dg-tile:hover { transform: translate(-2px, -2px) rotate(0deg); box-shadow: 8px 9px 0 var(--dg-ink); }
        }
        @media (max-width: 819px) {
          #root #services .dg-header { grid-template-columns: minmax(0, 1fr); gap: 24px; }
          #root #services .dg-grid { grid-template-columns: minmax(0, 1fr); }
          #root #services .dg-grid .dg-tile { grid-column: auto; padding-top: 58px; }
          #root main #services:not(#home):not(#weather) .dg-tile:first-child .dg-tile-title { font-size: 28px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          #root #services .dg-tile { transition: none; }
          #root #services .dg-tile:hover { transform: rotate(var(--dg-tilt)); box-shadow: 5px 6px 0 var(--dg-ink); }
        }
      `}</style>
      <svg className="dg-wave" viewBox="0 0 1440 56" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path fill="var(--dg-ink)" d="M0 0H1440V56H0Z" />
        <path fill="var(--dg-blue)" d="M0 29C72 10 120 49 208 31S351 12 430 31S563 46 649 26S775 14 855 32S971 45 1054 27S1235 16 1440 32V56H0Z" />
        <path fill="var(--dg-seafoam)" d="M0 44C77 30 131 55 221 44S357 30 444 43S575 59 674 44S807 30 902 44S1030 58 1140 43S1327 32 1440 44V56H0Z" />
      </svg>
      <div className="dg-content">
        <div className="dg-inner">
          <div className="dg-header">
            <div>
              <h2 id="services-heading">Municipal services, from your phone</h2>
              <svg className="dg-underline" viewBox="0 0 340 14" preserveAspectRatio="none" aria-hidden="true" focusable="false">
                <path d="M2 8C38 1 70 13 108 7S177 2 216 7S286 13 338 5" fill="none" stroke="var(--dg-green)" strokeWidth="3.5" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="dg-summary">Permits, certificates and public programs in one place. Each one is marked so you know if you can do it online or need to visit the hall.</p>
              <p className="dg-note">Ang uban online na, ang uban sa munisipyo pa.</p>
            </div>
          </div>
          <div className="dg-grid">
            {services.map(service => (
              <Link key={service.title} to={service.href} className="dg-tile">
                <service.icon className="dg-icon" size={34} strokeWidth={1.7} aria-hidden="true" />
                <span className="dg-stamp" data-status={service.status}>{statusLabels[service.status]}</span>
                <h3 className="dg-tile-title">{service.title}</h3>
                <p className="dg-description">{service.description}</p>
                <span className="dg-action">{service.action}</span>
              </Link>
            ))}
          </div>
          <p className="dg-footer">
            <Link to="/executive/directory" className="dg-directory">View all offices and departments</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
