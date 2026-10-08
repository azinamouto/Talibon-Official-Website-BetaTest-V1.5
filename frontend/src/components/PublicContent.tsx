import React from 'react';
import { Link } from 'react-router-dom';
import type { Pagination } from '../services/publicApi';

export function PublicShell({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-h-[60vh] break-words">
    <nav aria-label="Public content" className="flex flex-wrap gap-5 text-brand-primary font-semibold"><Link to="/services">Services</Link><Link to="/news">News & updates</Link></nav>
    <h1 className="text-3xl font-bold text-brand-text">{title}</h1>{children}
  </div>;
}
export function PublicState({ loading, error, retry }: { loading: boolean; error: string | null; retry: () => void }) {
  if (loading) return <p role="status" className="py-12 text-brand-muted">Loading content…</p>;
  if (error) return <div role="alert" className="civic-card p-6 space-y-4"><p>{error}</p><button className="px-4 py-2 rounded-lg bg-brand-primary text-white" onClick={retry}>Try again</button></div>;
  return null;
}
export function PublicPagination({ pagination, onPage }: { pagination: Pagination; onPage: (page: number) => void }) {
  if (pagination.totalPages < 2 && pagination.page === 1) return null;
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-center gap-4">
    <button className="px-4 py-2 border rounded-lg disabled:opacity-40" disabled={pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}>Previous</button>
    <span role="status">Page {pagination.page} of {pagination.totalPages} · {pagination.total} results</span>
    <button className="px-4 py-2 border rounded-lg disabled:opacity-40" disabled={pagination.page >= pagination.totalPages} onClick={() => onPage(pagination.page + 1)}>Next</button>
  </nav>;
}
export function pageNumber(value: string | null) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 10000 ? number : 1;
}
