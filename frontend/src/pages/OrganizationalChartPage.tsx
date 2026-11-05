import sectionTheme from "../styles/SectionTheme.module.css";
import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { User, Users, Loader2 } from 'lucide-react';
import { executiveApi } from '../services/api';

interface Official {
  name: string;
  role: string;
  image_url?: string;
}
interface OrganizationalChart {
  mayor: Official;
  level2: Official[];
  departments: Official[];
}

function isOfficial(value: unknown): value is Official {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.name === 'string' && typeof record.role === 'string' &&
    (record.image_url === undefined || typeof record.image_url === 'string');
}

function isOrganizationalChart(value: unknown): value is OrganizationalChart {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return isOfficial(record.mayor) &&
    Array.isArray(record.level2) && record.level2.every(isOfficial) &&
    Array.isArray(record.departments) && record.departments.every(isOfficial);
}

const DEPARTMENT_LOGOS: Record<string, string> = {
  "Office Of Municipal Agriculturist": "http://talibon.gov.ph/wp-content/uploads/2025/10/1.png",
  "Municipal Treasury Office": "http://talibon.gov.ph/wp-content/uploads/2025/10/10.png",
  "Municipal Planning And Development Office": "http://talibon.gov.ph/wp-content/uploads/2025/10/7.png",
  "Municipal Accounting Office": "http://talibon.gov.ph/wp-content/uploads/2025/10/3.png",
  "Municipal Economic Development & Investment Promotions Office": "http://talibon.gov.ph/wp-content/uploads/2025/10/3.png",
  "Municipal Public Employment Office": "http://talibon.gov.ph/wp-content/uploads/2025/10/5.png",
  "Municipal Social Welfare And Development Office": "http://talibon.gov.ph/wp-content/uploads/2025/10/8.png",
  "Municipal Market Administration Office": "http://talibon.gov.ph/wp-content/uploads/2025/10/6.png",
  "Talibon Traffic Management Unit": "http://talibon.gov.ph/wp-content/uploads/2025/10/9.png",
  "Municipal Internal Auditing Unit": "http://talibon.gov.ph/wp-content/uploads/2025/10/4.png",
  "Municipal General Services Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/General-Services.png",
  "Municipal Human Resource Management Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/HRMO.png",
  "Office Of The Municipal Civil Registrar": "https://talibon.gov.ph/wp-content/uploads/2022/01/LCR.png",
  "Municipal Assessor's Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/Assessor.png",
  "Municipal Budget Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/Budget-Office.png",
  "Municipal Engineering Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/Engineering-Office.png",
  "Municipal Health Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/Health-Office.png",
  "Municipal Disaster Risk Reduction And Management Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/DRRMO.png",
  "Municipal Information Technology Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/ITO.png",
  "Municipal Tourism Office": "https://talibon.gov.ph/wp-content/uploads/2022/01/Tourism-Office.png",
};

const OrganizationalChartPage: React.FC = () => {
  const [data, setData] = useState<OrganizationalChart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    executiveApi.getChart(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      if (isOrganizationalChart(result)) setData(result);
      else setError('The organizational chart response is invalid.');
    }).catch(() => {
      if (!controller.signal.aborted) setError('The organizational chart is temporarily unavailable.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);

  if (loading) {
    return (
      <div className={`${sectionTheme.section} pb-20 flex items-center justify-center min-h-screen bg-brand-bg`}>
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${sectionTheme.section} pb-20 px-4 max-w-7xl mx-auto min-h-screen bg-brand-bg pt-6`}>
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl font-bold">
          {error}
        </div>
        <button className="mt-4 underline" onClick={() => setAttempt(value => value + 1)}>Retry</button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`${sectionTheme.section} pb-20 px-4 max-w-7xl mx-auto min-h-screen bg-brand-bg pt-6 flex flex-col items-center justify-center text-center`}>
        <Users className="w-16 h-16 text-brand-muted/30 mb-4" />
        <h2 className="text-2xl font-bold text-brand-text mb-2">Structure Not Found</h2>
        <p className="text-brand-muted max-w-md">The organizational chart is currently being updated. Please check back later.</p>
      </div>
    );
  }

  return (
    <div className={`${sectionTheme.section} ${sectionTheme.headerClearance} pb-12 px-4 md:px-6 max-w-6xl mx-auto min-h-screen bg-brand-bg relative overflow-hidden`}>
      <div className="relative z-10">
        <div className="mb-6 text-center">
          <span className="section-label">Executive Structure</span>
          <h1 className="text-2xl sm:text-3xl font-black text-brand-text font-display uppercase tracking-tight">
            Organizational Chart
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted font-medium max-w-xl mx-auto mt-1 leading-relaxed">
            Administrative hierarchy of the Municipality of Talibon showcasing executive leadership and departmental offices.
          </p>
        </div>

        <div className="flex flex-col items-center space-y-4 py-2">
          {/* Level 1: Mayor */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center"
          >
            <div className="p-4 sm:p-5 bg-brand-primary text-white rounded-2xl shadow-lg text-center min-w-[260px] sm:min-w-[300px] relative flex flex-col items-center border border-brand-primary/30">
              {data.mayor.image_url && (
                <div className="w-16 h-16 rounded-full border-2 border-white/30 overflow-hidden mb-2 bg-white/10 flex items-center justify-center">
                  <img 
                    src={data.mayor.image_url} 
                    alt={`${data.mayor.name} Portrait`} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <h3 className="text-lg sm:text-xl font-bold mb-0.5 font-display uppercase tracking-tight">{data.mayor.name}</h3>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-white/80">{data.mayor.role}</p>
            </div>
            <div className="w-px h-6 bg-brand-border" />
          </motion.div>

          {/* Level 2: Vice Mayor & SB */}
          <div className="w-full max-w-3xl relative">
            {/* Horizontal connector bar */}
            <div className="hidden sm:block absolute top-0 left-12 right-12 h-px bg-brand-border" />
            
            <div className={`grid grid-cols-1 sm:grid-cols-${Math.min(data.level2.length, 3)} gap-3 pt-4 sm:pt-6`}>
              {data.level2.map((item: any, idx: number) => (
                <motion.div 
                  key={`${item.role}-${idx}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  className="flex flex-col items-center relative"
                >
                  {/* Vertical connector up to horizontal line */}
                  <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-brand-border -translate-y-6" />
                  
                  <div className="p-3.5 bg-brand-surface text-brand-text rounded-xl text-center w-full border border-brand-border hover:border-brand-primary/30 transition-all flex flex-col items-center justify-center shadow-xs">
                    {item.image_url && (
                      <div className="w-12 h-12 rounded-full border border-brand-border overflow-hidden mb-2 bg-brand-surface/50 flex items-center justify-center">
                        <img 
                          src={item.image_url} 
                          alt={`${item.name} Portrait`} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    <h4 className="text-xs sm:text-sm font-bold mb-0.5 font-display uppercase tracking-tight">{item.name}</h4>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-brand-primary">{item.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="w-px h-6 bg-brand-border hidden sm:block" />

          {/* Level 3: Departments */}
          <div className="w-full relative">
            {/* Horizontal connector for departments */}
            <div className="hidden sm:block absolute top-0 left-8 right-8 h-px bg-brand-border" />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 sm:pt-6">
              {data.departments.map((dept: any, idx: number) => (
                <motion.div 
                  key={`${dept.role}-${idx}`}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + idx * 0.03 }}
                  className="flex flex-col items-center relative"
                >
                  {/* Vertical connector to horizontal line */}
                  <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-px h-6 bg-brand-border -translate-y-6" />
                  
                  <div className="p-3 bg-white border border-brand-border rounded-xl hover:shadow-md hover:border-brand-primary/30 transition-all text-center w-full group h-full flex flex-col items-center justify-center">
                    <div className="w-8 h-8 bg-brand-surface rounded-lg mx-auto mb-2 flex items-center justify-center overflow-hidden shrink-0">
                      {dept.image_url || DEPARTMENT_LOGOS[dept.role] ? (
                        <img 
                          src={dept.image_url || DEPARTMENT_LOGOS[dept.role]} 
                          alt={`${dept.role} Logo`} 
                          className={`w-full h-full ${dept.image_url ? 'object-cover' : 'object-contain p-1.5'}`}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <User className="w-4 h-4 text-brand-muted/40" />
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-brand-text mb-0.5 leading-tight font-display uppercase tracking-tight">{dept.name}</h5>
                    <p className="text-[8.5px] font-bold uppercase tracking-wider text-brand-muted">{dept.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrganizationalChartPage;
