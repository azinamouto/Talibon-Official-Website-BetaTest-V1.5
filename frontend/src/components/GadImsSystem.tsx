import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import styles from './GadImsSystem.module.css';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell 
} from 'recharts';

interface SubSection {
  subTitle: string;
  items: string[];
}

interface Section {
  id: string;
  title: string;
  content: SubSection[];
}

interface GadImsData {
  title: string;
  subtitle: string;
  sections: Section[];
}

const MOCK_CHART_DATA = [
  { name: 'Health', value: 400, color: 'var(--talweb-deep)' },
  { name: 'Education', value: 300, color: 'var(--talweb-primary)' },
  { name: 'Economy', value: 300, color: 'var(--talweb-background)' },
  { name: 'Governance', value: 200, color: 'var(--talweb-card)' },
];

const MOCK_BAR_DATA = [
  { year: '2021', budget: 45 },
  { year: '2022', budget: 52 },
  { year: '2023', budget: 61 },
  { year: '2024', budget: 75 },
];

export function GadImsHeader() {
  return <div className={styles.header}>
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand-text font-display tracking-tight">Talibon GAD-IMS</h1>
      <p className={styles.tagline}>Mainstreaming Gender-Responsive Governance through Data</p>
    </div>
    <a className={styles.access} href="https://tagad-sys.vercel.app/" target="_blank" rel="noopener noreferrer">Access GAD-IMS</a>
  </div>;
}

const GadImsSystem: React.FC<{ data: GadImsData }> = ({ data }) => {
  const [activeTab, setActiveTab] = useState(data?.sections?.[0]?.id || "overview");
  const reducedMotion = useReducedMotion();
  const sections = data?.sections ? [
    ...data.sections.slice(0, 2),
    ...data.sections.slice(2)
  ] : [];

  if (!data?.sections || data.sections.length === 0) {
    return <div className="p-12 text-center bg-gray-50 rounded-[2rem] border border-brand-border">
      <h3 className="text-xl font-bold text-brand-text mb-2 tracking-tight">GAD-IMS Database Offline</h3>
      <p className="text-sm text-brand-muted font-medium max-w-md mx-auto">
        The Gender and Development Integrated Management System data has not been seeded yet.
        Please contact the system administrator to initialize the GAD database.
      </p>
    </div>;
  }
  const activeSection = sections.find(s => s.id === activeTab);
  return <div className={styles.layout}>
    <aside className={styles.sidebar}>
      <p className={styles.menuLabel}>Sections</p>
      <nav aria-label="GAD-IMS sections" className={styles.menu}>
        {sections.map(section => <button key={section.id} type="button"
          onClick={() => setActiveTab(section.id)} aria-current={activeTab === section.id ? 'true' : undefined}
          className={styles.menuItem}>
          {section.title.split('. ')[1] || section.title}
        </button>)}
      </nav>
    </aside>
    <section className={styles.content} aria-labelledby="gad-active-heading">
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={reducedMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
          transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }} className={styles.contentFlow}>
          <h2 id="gad-active-heading" className={styles.sectionHeading}>{activeSection?.title}</h2>
            {activeTab === 'reporting' || activeTab === 'budgeting' ? (
              <div className={`${styles.metrics} bg-brand-bg border border-brand-border rounded-xl relative overflow-hidden`}>
                <div className="space-y-4 relative z-10">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">System Dashboard / Metrics</h3>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={MOCK_BAR_DATA}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="year" stroke="#64748b" fontSize={10} />
                        <YAxis stroke="#64748b" fontSize={10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#0f172a' }}
                        />
                        <Bar dataKey="budget" fill="var(--talweb-primary)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-4 relative z-10">
                  <h3 className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">Gender Sector Distribution</h3>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={MOCK_CHART_DATA}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {MOCK_CHART_DATA.map((entry, index) => (
                            <Cell key={`recharts-pie-cell-${index}`} fill={entry.color} stroke="var(--talweb-deep)" strokeWidth={1.5} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {MOCK_CHART_DATA.map(d => (
                      <div key={`chart-legend-${d.name}`} className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color, border: '1px solid var(--talweb-deep)' }} />
                        <span className="text-[8px] font-bold uppercase tracking-wider text-brand-muted">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}


          {activeTab === 'data-entry' ? (
            <div className="flex-1 mt-2"><p>Online services are to be implemented.</p></div>
          ) : (
            <div className={styles.cards}>
              {activeSection?.content.map((sub, idx) => <motion.div key={`gad-subsection-${idx}`}
                initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: reducedMotion ? 0 : undefined, delay: reducedMotion ? 0 : idx * 0.05 }}
                className={styles.card}>
                <h3>{sub.subTitle}</h3>
                <ul className={styles.items}>{sub.items.map((item, i) => <li key={`gad-item-${idx}-${i}`}>{item}</li>)}</ul>
              </motion.div>)}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  </div>;
};
export default GadImsSystem;
