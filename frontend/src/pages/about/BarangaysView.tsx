import React, { useState } from "react";
import styles from "./BarangaysView.module.css";

interface Barangay {
  id: string;
  name?: string;
  barangay_name?: string;
  captain?: string | null;
  captain_name?: string | null;
  population?: number;
  contact_number?: string | null;
  office_address?: string | null;
  office_hours?: string | null;
  cover_image?: string | null;
}

interface BarangaysViewProps {
  data: Barangay[];
}

export default function BarangaysView({ data }: BarangaysViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Normalization helper
  const normalizeBarangay = (brgy: Barangay) => {
    return {
      id: brgy.id,
      name: brgy.barangay_name || brgy.name || "Unnamed Barangay",
      captain: brgy.captain_name || brgy.captain || "Not specified",
      population: brgy.population || 0,
      contact_number: brgy.contact_number || "",
      office_address: brgy.office_address || "",
      office_hours: brgy.office_hours || "Not specified",
      cover_image: brgy.cover_image || ""
    };
  };

  const rawData = Array.isArray(data) ? data : [];
  const normalizedData = rawData.map(normalizeBarangay);

  const filteredBarangays = normalizedData.filter((brgy) => {
    const term = searchTerm.toLowerCase();
    const nameMatch = brgy.name.toLowerCase().includes(term);
    const captainMatch = brgy.captain.toLowerCase().includes(term);
    return nameMatch || captainMatch;
  });

  // Calculate pagination
  const totalItems = filteredBarangays.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  // Reset page if searchTerm changes and filtered list shrinks
  const safeCurrentPage = Math.min(currentPage, Math.max(1, totalPages));
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBarangays = filteredBarangays.slice(startIndex, endIndex);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Barangay profiles</h1>
          <p>Find the barangay captain and office hours for each of Talibon’s {normalizedData.length} communities.</p>
        </div>
        <div className={styles.search}>
          <label className="sr-only" htmlFor="barangay-profile-search">Search by barangay or captain</label>
          <input id="barangay-profile-search" type="search" placeholder="Search by barangay or captain"
            value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
        </div>
      </div>
      <p className={styles.count} role="status">{totalItems} {totalItems === 1 ? 'barangay' : 'barangays'}</p>
      <div className={styles.grid}>
        {paginatedBarangays.map(brgy => (
          <article key={brgy.id} className={styles.card}>
            <h2>{brgy.name}</h2>
            <dl>
              <div><dt>Captain</dt><dd>{brgy.captain}</dd></div>
              <div><dt>Office hours</dt><dd>{brgy.office_hours}</dd></div>
              {brgy.population > 0 && <div><dt>Population</dt><dd>{brgy.population.toLocaleString()}</dd></div>}
              {brgy.contact_number && <div><dt>Contact number</dt><dd>{brgy.contact_number}</dd></div>}
              {brgy.office_address && <div><dt>Office address</dt><dd>{brgy.office_address}</dd></div>}
            </dl>
          </article>
        ))}
        {paginatedBarangays.length === 0 && <div className={styles.empty}>
          <p>No barangays match your search</p>
          <p>Try a different name or spelling</p>
        </div>}
      </div>
      {totalPages > 1 && <div className={styles.pagination}>
        <p>Page {safeCurrentPage} of {totalPages} · {totalItems} {totalItems === 1 ? 'barangay' : 'barangays'}</p>
        <nav aria-label="Barangay results pages">
          <button type="button" disabled={safeCurrentPage === 1}
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}>Previous</button>
          {Array.from({length: totalPages}, (_, index) => index + 1).map(page => (
            <button type="button" key={page} aria-label={`Page ${page}`}
              aria-current={page === safeCurrentPage ? 'page' : undefined}
              onClick={() => setCurrentPage(page)}>{page}</button>
          ))}
          <button type="button" disabled={safeCurrentPage === totalPages}
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}>Next</button>
        </nav>
      </div>}
    </div>
  );
}
