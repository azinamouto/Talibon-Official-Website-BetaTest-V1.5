import { Briefcase, Camera, CreditCard, Cross, FileText, Globe, HeartPulse, Landmark, MapPin, Scale, ShieldCheck, Shovel, Sprout, Trash2, Users, type LucideIcon } from 'lucide-react';

export const charterPdf = 'https://talibon.gov.ph/wp-content/uploads/2026/02/2025-CITIZENS-CHARTER-FINALE.pdf';

export interface CharterOffice {
  name: string;
  acronym?: string;
  services: string[];
  keywords?: string;
  icon: LucideIcon;
  /** Physical PDF page, verified against the official document, not its printed number. */
  page?: number;
  contacts?: boolean;
}

export const charterGroups: { name: string; internal?: boolean; offices: CharterOffice[] }[] = [
  { name: 'Civil & business services', offices: [
    { name: 'Local Civil Registry Office', acronym: 'LCRO', services: ['Birth, marriage & death certificates', 'Civil registry documents'], icon: FileText, page: 106 },
    { name: 'Business Permits & Licensing Office', acronym: 'BPLO', services: ['New business permit applications', 'Business permit renewals'], icon: Briefcase, page: 215 },
    { name: 'Mayor’s Office', services: ['Permits & clearances', 'Executive services'], keywords: 'mayor clearance', icon: Landmark },
    { name: 'Treasurer’s Office', services: ['Tax payments & collection', 'Treasury services'], keywords: 'real property tax payment', icon: CreditCard },
    { name: 'Assessor’s Office', services: ['Tax declarations & land certifications', 'Property transfers'], keywords: 'real property land assessment', icon: MapPin },
    { name: 'Engineering Office', services: ['Building permits', 'Certificates of occupancy'], icon: Shovel, page: 97 },
    { name: 'Municipal Planning & Development Office', acronym: 'MPDO', services: ['Locational clearances', 'Land use planning'], keywords: 'zoning', icon: Globe },
  ] },
  { name: 'Social & health services', offices: [
    { name: 'Municipal Social Welfare & Development Office', acronym: 'MSWDO', services: ['Assistance for families in crisis', 'Senior citizen & PWD support'], keywords: 'medical social assistance disability persons disabilities', icon: HeartPulse },
    { name: 'Rural Health Unit', acronym: 'RHU', services: ['Medical consultations', 'Prenatal care'], keywords: 'health clinic doctor medical assistance', icon: HeartPulse, page: 129 },
    { name: 'Public Employment Service Office', acronym: 'PESO', services: ['Employment programs', 'SPES & GIP assistance'], keywords: 'jobs work employment students internship', icon: Briefcase },
    { name: 'Local Disaster Risk Reduction & Management Office', acronym: 'LDRRMO', services: ['Ambulance services', 'Disaster preparedness training'], keywords: 'emergency emergencies rescue', icon: ShieldCheck },
  ] },
  { name: 'Community & economy', offices: [
    { name: 'Agriculture Office', services: ['Agricultural support', 'Livestock & crop programs'], keywords: 'farm farming artificial insemination AI', icon: Sprout, page: 10 },
    { name: 'Tourism Office', services: ['Ecotourism activities', 'Tourist coordination'], keywords: 'visit travel tourism', icon: Camera, contacts: true },
    { name: 'Solid Waste Office', services: ['Waste collection & disposal', 'Environmental sanitation'], keywords: 'garbage environment', icon: Trash2 },
    { name: 'Cemetery Office', services: ['Burial lot applications', 'Niche reservations'], keywords: 'cemetery burial funeral', icon: Cross, contacts: true },
  ] },
  { name: 'Internal & legislative services', internal: true, offices: [
    { name: 'Human Resource Management Office', acronym: 'HRMO', services: ['Service records & employment certificates', 'Salary adjustments'], keywords: 'employee staff human resources', icon: Users },
    { name: 'Accounting Office', services: ['Disbursement vouchers', 'Financial documents'], icon: CreditCard },
    { name: 'Budget Office', services: ['Obligation requests', 'Barangay & SK budget review'], icon: FileText },
    { name: 'Sangguniang Bayan Office', acronym: 'SB', services: ['Ordinance review & NGO accreditation', 'Tricycle franchises'], keywords: 'legislative council', icon: Scale, contacts: true },
  ] },
];

// No standalone service routes are assumed. Anchors use verified physical PDF pages.
export const charterTasks = [
  { label: 'Birth, marriage or death certificate', page: 121 },
  { label: 'Business permit', page: 215 },
  { label: 'Building permit', page: 102 },
  { label: 'Tax declaration', search: 'tax declaration' },
  { label: 'Medical consultation', page: 129 },
  { label: 'Burial lot', search: 'burial' },
];

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').toLowerCase();
export function matchesCharterOffice(office: CharterOffice, query: string): boolean {
  const text = normalize([office.name, office.acronym, ...office.services, office.keywords].join(' '));
  return normalize(query).trim().split(/\s+/).every(word => text.includes(word));
}
