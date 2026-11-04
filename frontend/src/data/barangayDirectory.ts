/** Homepage-only reference; no sample officials or contacts.
 * Names: PSA PSGC list dated 31 July 2025, checked 4 November 2026.
 * https://psa.gov.ph/classification/psgc/barangays/0701243000
 * Eight island barangays: ESSC/MPDO forum report, 25 June 2026.
 * https://essc.org.ph/content/accompanying-talibon-island-barangays-in-seeking-climate-resilience-pathways-the-talibon-island-barangays-forum/
 * Mainland is the complement of the eight islands in the PSA list.
 */
export interface BarangayReference {
  name: string;
  location: 'Mainland' | 'Island';
}
export const BARANGAY_REFERENCE: readonly BarangayReference[] = [
  { name: 'Bagacay', location: 'Mainland' },
  { name: 'Balintawak', location: 'Mainland' },
  { name: 'Burgos', location: 'Mainland' },
  { name: 'Busalian', location: 'Island' },
  { name: 'Calituban', location: 'Island' },
  { name: 'Cataban', location: 'Island' },
  { name: 'Guindacpan', location: 'Island' },
  { name: 'Magsaysay', location: 'Mainland' },
  { name: 'Mahanay', location: 'Island' },
  { name: 'Nocnocan', location: 'Island' },
  { name: 'Poblacion', location: 'Mainland' },
  { name: 'Rizal', location: 'Mainland' },
  { name: 'Sag', location: 'Island' },
  { name: 'San Agustin', location: 'Mainland' },
  { name: 'San Carlos', location: 'Mainland' },
  { name: 'San Francisco', location: 'Mainland' },
  { name: 'San Isidro', location: 'Mainland' },
  { name: 'San Jose', location: 'Mainland' },
  { name: 'San Pedro', location: 'Mainland' },
  { name: 'San Roque', location: 'Mainland' },
  { name: 'Santo Niño', location: 'Mainland' },
  { name: 'Sikatuna', location: 'Mainland' },
  { name: 'Suba', location: 'Island' },
  { name: 'Tanghaligue', location: 'Mainland' },
  { name: 'Zamora', location: 'Mainland' },
];
