import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, FileText, Newspaper, FileCode, ArrowRight, Loader2, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import { publicGet, SearchItem, searchLink } from "../services/publicApi";

interface SearchResult {
  id: string;
  title: string;
  type: "news" | "services" | "pages";
  url: string;
  description?: string;
  date?: string;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setSearchQuery("");
      setResults([]);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const controller = new AbortController();
    const q = searchQuery.trim();
    setResults([]);
    setError(null);
    setLoading(isOpen && q.length >= 2);
    if (!isOpen || q.length < 2) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const response = await publicGet<{ data: SearchItem[] }>(`search?${new URLSearchParams({ q, limit: '10' })}`, controller.signal);
        if (!controller.signal.aborted) setResults(response.data.map(item => ({ id: item.id, title: item.title, type: item.type, url: searchLink(item), description: item.snippet })));
      } catch {
        if (!controller.signal.aborted) setError('Search is temporarily unavailable. Please try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [searchQuery, isOpen, attempt]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[105] flex items-start justify-center pt-24 px-4 sm:px-6"
          onKeyDown={handleKeyDown}
          role="dialog"
          aria-modal="true"
          aria-label="Site search"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-text/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] overflow-hidden border border-gray-100"
          >
            <div className="p-8 pb-4">
              <div className="relative group">
                <Search
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-primary transition-colors"
                  size={24}
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Search news, services, pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  maxLength={100}
                  aria-label="Search the site"
                  className="w-full bg-brand-bg rounded-2xl py-6 pl-16 pr-16 text-lg font-bold tracking-tight focus:outline-none focus:ring-4 focus:ring-brand-primary/10 transition-all border border-transparent focus:bg-white focus:border-brand-primary/20"
                />
                <button
                  onClick={onClose}
                  aria-label="Close search"
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-xl transition-colors text-brand-muted"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-brand-muted px-4">
                <span>
                  {results.length > 0
                    ? `${results.length} result${results.length !== 1 ? 's' : ''} found`
                    : searchQuery.length < 2
                    ? "Type at least 2 characters"
                    : loading
                    ? "Searching..."
                    : error ? "Search unavailable" : "No results found"}
                </span>
                <kbd className="bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 text-[8px]">
                  ESC
                </kbd>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-4 pb-8">
              <AnimatePresence mode="wait">
                {error ? <div key="error" role="alert" className="p-6 space-y-4"><p>{error}</p><button className="px-4 py-2 rounded-lg bg-brand-primary text-white" onClick={() => setAttempt(value => value + 1)}>Try again</button></div> : loading ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center py-20 gap-4"
                    aria-live="polite"
                  >
                    <Loader2 className="w-10 h-10 text-brand-primary animate-spin" aria-label="Searching" />
                    <span className="text-xs font-bold text-brand-muted uppercase tracking-widest">
                      Searching portal data...
                    </span>
                  </motion.div>
                ) : results.length > 0 ? (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="grid grid-cols-1 gap-2"
                    role="list"
                    aria-label="Search results"
                  >
                    {results.map((result) => (
                      <Link
                        key={`${result.type}-${result.id}`}
                        to={result.url}
                        onClick={onClose}
                        className="group flex flex-col sm:flex-row sm:items-center gap-4 p-6 hover:bg-brand-primary/5 rounded-3xl border border-transparent hover:border-brand-primary/10 transition-all"
                      >
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
                            result.type === "news"
                              ? "bg-sky-50 text-sky-600"
                              : result.type === "services"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-green-50 text-green-600"
                          }`}
                          aria-hidden="true"
                        >
                          {result.type === "news" ? (
                            <Newspaper size={20} />
                          ) : result.type === "services" ? (
                            <FileCode size={20} />
                          ) : (
                            <Globe size={20} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-brand-muted opacity-60">
                              {result.type}
                            </span>
                            {result.date && (
                              <>
                                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                <span className="text-[8px] font-black uppercase tracking-widest text-brand-muted opacity-60">
                                  {new Date(result.date).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                          <h4 className="text-base font-extrabold text-brand-text truncate group-hover:text-brand-primary transition-colors">
                            {result.title}
                          </h4>
                          {result.description && (
                            <p className="text-xs text-brand-muted line-clamp-1 font-medium mt-0.5">
                              {result.description}
                            </p>
                          )}
                        </div>

                        <ArrowRight
                          size={16}
                          className="text-brand-muted opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all"
                          aria-hidden="true"
                        />
                      </Link>
                    ))}
                  </motion.div>
                ) : searchQuery.length >= 2 && !loading ? (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-20 px-8"
                    role="status"
                  >
                    <div className="w-20 h-20 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Search size={32} className="text-gray-300" aria-hidden="true" />
                    </div>
                    <h3 className="text-xl font-bold text-brand-text mb-2 tracking-tight">
                      No results for "{searchQuery}"
                    </h3>
                    <p className="text-sm text-brand-muted font-medium">
                      Try broader terms like "Health", "Tourism", or "Permit".
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="suggestions"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8"
                  >
                    <p className="text-[10px] font-black text-brand-muted uppercase tracking-[0.2em] mb-6 border-b border-gray-100 pb-4">
                      Suggestions
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {["History", "Ordinances", "Profile", "News", "Charter", "Services"].map(
                        (tag) => (
                          <button
                            key={tag}
                            onClick={() => setSearchQuery(tag)}
                            className="px-6 py-3 bg-brand-surface rounded-xl text-xs font-bold text-brand-text hover:bg-brand-primary hover:text-white transition-all border border-brand-border"
                          >
                            {tag}
                          </button>
                        )
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-gray-50 p-6 flex justify-center items-center border-t border-gray-100">
              <div className="flex items-center gap-2 opacity-50">
                <img
                  src="http://talibon.gov.ph/wp-content/uploads/2025/09/Talibon-Official-Seal-v4-2003-to-2023-.png"
                  alt=""
                  className="h-6 w-6 grayscale"
                  referrerPolicy="no-referrer"
                  aria-hidden="true"
                />
                <span className="text-[8px] font-black uppercase tracking-widest text-brand-text">
                  Talibon Smart Gateway Search
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlobalSearch;
