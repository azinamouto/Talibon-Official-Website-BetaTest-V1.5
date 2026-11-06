import React, { useState, useEffect } from 'react';
import { legislativeApi } from '../services/api';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, Download, Folder, Grid, List as ListIcon, ChevronRight } from 'lucide-react';
import styles from './EnactedOrdinancesPage.module.css';

interface Ordinance {
  id: string;
  title: string;
  year: string;
  file_url: string;
  file_size?: string;
  created_at?: string;
}

function isOrdinance(value: unknown): value is Ordinance {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== 'string' || typeof record.title !== 'string' || !record.title.trim() ||
      typeof record.year !== 'string' || !/^\d{4}$/.test(record.year) ||
      typeof record.file_url !== 'string' || !record.file_url.trim() || record.file_url.trim() === '#' ||
      (record.file_size !== undefined && typeof record.file_size !== 'string') ||
      (record.created_at !== undefined && typeof record.created_at !== 'string')) return false;
  try {
    const url = new URL(record.file_url, window.location.origin);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

const EnactedOrdinancesPage: React.FC = () => {
  const [ordinances, setOrdinances] = useState<Ordinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeYear, setActiveYear] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(false);
    legislativeApi.getOrdinances(controller.signal).then(result => {
      if (controller.signal.aborted) return;
      const records = Array.isArray(result) ? result.filter(isOrdinance) : [];
      setOrdinances(records);
      setActiveYear(records.map(item => item.year).sort((a, b) => b.localeCompare(a))[0] || '');
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const years = Array.from(new Set(ordinances.map(o => o.year))).sort((a, b) => b.localeCompare(a));
  
  const filteredOrdinances = ordinances.filter(o => 
    o.year === activeYear && 
    o.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={`${styles.section} min-h-screen bg-brand-bg pt-6 sm:pt-8 pb-20 relative overflow-hidden`}>
      {/* Background Elements */}
      <div className="hidden absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            x: [0, 50, 0],
            y: [0, 30, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-24 -left-24 w-[40rem] h-[40rem] bg-brand-primary/5 rounded-full blur-[120px]"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-[var(--ordinances-sky-light)] rounded-2xl flex items-center justify-center text-brand-primary shadow-xs">
              <FileText size={24} />
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-brand-text tracking-tight uppercase font-display">Enacted Ordinances</h1>
          </div>
          <p className="text-lg text-brand-muted font-medium max-w-2xl">
            Access the official legislative records and municipal ordinances of Talibon.
          </p>
        </div>

        {/* Year Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setActiveYear(year)}
              className={`px-8 py-4 rounded-2xl font-bold text-sm tracking-widest transition-all ${
                activeYear === year 
                ? 'bg-[var(--ordinances-sky)] text-brand-text shadow-xs'
                : 'bg-white text-brand-muted hover:bg-[var(--ordinances-sky-light)] border border-brand-border'
              }`}
            >
              MUN - ORD {year}
            </button>
          ))}
        </div>

        {/* Search & Controls */}
        <div className="pro-card p-6 mb-12 flex flex-col md:flex-row gap-6 items-center justify-between">
          <div className="relative w-full md:max-w-md group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-primary transition-colors" size={20} />
            <input
              type="text"
              placeholder="Search by title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-brand-bg border border-transparent rounded-2xl py-4 pl-16 pr-6 text-sm font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:bg-white focus:border-brand-primary/20 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 p-1 bg-brand-bg rounded-2xl border border-brand-border">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'list' ? 'bg-[var(--ordinances-sky-light)] text-brand-text shadow-xs' : 'text-brand-muted hover:text-brand-text'}`}
            >
              <ListIcon size={20} />
            </button>
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-3 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-[var(--ordinances-sky-light)] text-brand-text shadow-xs' : 'text-brand-muted hover:text-brand-text'}`}
            >
              <Grid size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-brand-muted font-bold uppercase tracking-widest text-xs">Loading records...</p>
          </div>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-800">
            Ordinances are temporarily unavailable. Please try again later.
          </div>
        ) : filteredOrdinances.length > 0 ? (
          <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8" : "space-y-4"}>
            <AnimatePresence mode="popLayout">
              {filteredOrdinances.map((ord) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={ord.id}
                  className={viewMode === 'grid' 
                    ? "group pro-card p-8 flex flex-col items-center text-center hover:border-brand-primary/30 transition-all"
                    : `group pro-card ${styles.listCard} p-6 flex items-center gap-6 hover:border-brand-primary/30 transition-all`
                  }
                >
                  <div className={viewMode === 'grid' ? "mb-8 relative" : "relative"}>
                    <div className="w-24 h-32 bg-brand-bg rounded-2xl flex flex-col items-center justify-center border border-brand-border group-hover:bg-brand-primary/5 transition-colors">
                      <FileText size={40} className="text-brand-primary transition-colors" />
                      <div className="absolute bottom-4 bg-[var(--ordinances-sky-light)] text-brand-text text-[10px] font-bold px-2 py-1 rounded-md shadow-xs">PDF</div>
                    </div>
                  </div>

                  <div className={viewMode === 'grid' ? "flex-1 flex flex-col" : "flex-1"}>
                    <h3 className="text-lg font-extrabold text-brand-text leading-tight mb-4 transition-colors font-display">
                      {ord.title}
                    </h3>
                    <div className="flex items-center justify-center gap-4 text-[10px] font-bold text-brand-muted uppercase tracking-widest">
                      {ord.file_size && <span>{ord.file_size}</span>}
                      {ord.created_at && <><span className="w-1 h-1 bg-brand-border rounded-full" />
                      <span>{new Date(ord.created_at).toLocaleDateString()}</span></>}
                    </div>
                  </div>

                  <a
                    href={ord.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={viewMode === 'grid'
                      ? "mt-8 w-full py-4 bg-[var(--ordinances-sky-light)] text-brand-text rounded-2xl font-bold text-[10px] tracking-widest hover:bg-[var(--ordinances-sky)] transition-all flex items-center justify-center gap-2 group/btn"
                      : "px-8 py-4 bg-[var(--ordinances-sky-light)] text-brand-text rounded-2xl font-bold text-[10px] tracking-widest hover:bg-[var(--ordinances-sky)] transition-all flex items-center justify-center gap-2 group/btn"
                    }
                  >
                    <Download size={14} className="group-hover/btn:scale-110 transition-transform" />
                    DOWNLOAD
                  </a>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-32 pro-card border-dashed border-brand-border">
            <Folder className="mx-auto text-brand-muted/20 mb-6" size={64} />
            <h3 className="text-2xl font-extrabold text-brand-text mb-2 font-display">No ordinances found</h3>
            <p className="text-brand-muted font-medium">
              {ordinances.length ? 'Try adjusting your search or selecting a different year.' : 'No published ordinances are currently available.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnactedOrdinancesPage;
