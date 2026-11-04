import solidTheme from "../styles/SolidTheme.module.css";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import compact from "./CompactSections.module.css";

export default function Tourism() {
  const destinations = [
    {
      title: "Danajon Bank",
      category: "Double Barrier Reef",
      description: "One of only six double barrier reefs in the world.",
      image: "/images/danajon_bank.jpg",
      href: "/tourism/spots"
    },
    {
      title: "Holy Trinity",
      category: "Historical Site",
      description: "A beautiful landmark of faith and history.",
      image: "/images/holy_trinity.jpg",
      href: "/tourism/spots"
    },
    {
      title: "Sandbars",
      category: "Nature & Beach",
      description: "Explore the pristine islands scattered across the bank.",
      image: "/images/sandbars.jpg",
      href: "/tourism/spots"
    },
  ];

  return (
    <section id="tourism" className={`${solidTheme.section} ${compact.tourism} bg-brand-bg relative overflow-hidden`}>
      <div className="site-container">
        <div className={compact.tourismHeader}>
          <div className="max-w-2xl">
            <span className="section-label">Explore Talibon</span>
            <h2 className="section-title">Beyond the Horizon</h2>
          </div>
          <p className="text-brand-muted font-normal text-base max-w-sm leading-relaxed">
            Discover the unique biodiversity of the Danajon Bank and the vibrant cultural heritage of northern Bohol.
          </p>
        </div>

        <div className={compact.destinations}>
          {destinations.map((spot, idx) => (
            <motion.div
              key={spot.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
              className={`${compact.destination} ${idx % 2 === 1 ? compact.reversed : ''}`}
            >
              <div className={`${compact.visual} relative group`}>
                <div className={compact.destinationImage}>
                  <img 
                    src={spot.image} 
                    alt={spot.title} 
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {/* Floating Number */}
                <span className={`${compact.destinationNumber} font-extrabold text-brand-primary/5 select-none pointer-events-none font-display`}>
                  0{idx + 1}
                </span>
              </div>

              <div className={compact.destinationCopy}>
                <div className={compact.destinationTitle}>
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-[0.4em]">{spot.category}</span>
                  <h3 className="text-3xl md:text-4xl font-semibold text-brand-text tracking-tight font-display uppercase">{spot.title}</h3>
                </div>
                <p className="text-base text-brand-muted font-normal leading-relaxed max-w-md">
                  {spot.description}
                </p>
                <Link 
                  to={spot.href}
                  className="minimal-button-outline inline-flex"
                >
                  Explore Destination <ArrowUpRight size={18} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        <div className={compact.tourismClosing}>
          <Link 
            to="/tourism/spots"
            className="minimal-button-primary inline-flex"
          >
            View All Destinations
          </Link>
        </div>
      </div>
    </section>
  );
}


