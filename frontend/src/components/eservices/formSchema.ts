import { BARANGAYS } from '../../constants/barangayConfig';

export interface FieldSchema {
  name: string;
  label: string;
  type?: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea';
  maxLength?: number;
  min?: number;
  max?: number;
  integer?: boolean;
  options?: { value: string; label: string }[];
  hint?: string;
  autoComplete?: string;
}
const text = (name: string, label: string, maxLength: number): FieldSchema => ({ name, label, maxLength });
const number = (name: string, label: string, min: number, max: number, integer = false): FieldSchema => ({ name, label, type: 'number', min, max, integer });
export const applicantFields: FieldSchema[] = [
  { ...text('fullName', 'Full legal name', 100), autoComplete: 'name' },
  { name: 'barangay', label: 'Barangay', type: 'select', options: BARANGAYS.map(b => ({ value: b.id, label: b.name })) },
  { name: 'email', label: 'Account email', type: 'email', maxLength: 254, autoComplete: 'email', hint: 'Notifications are sent to your signed-in account.' },
  { name: 'mobileNumber', label: 'Mobile number', type: 'tel', autoComplete: 'tel', hint: 'Use 09171234567 or +639171234567.' },
  { ...text('purpose', 'Purpose of request', 1000), type: 'textarea' },
];
const propertyFields = [text('propertyAddress', 'Property address', 300), text('lotNumber', 'Lot number', 100), text('taxDeclarationNo', 'Tax declaration number', 100)];
export const formSchemas = {
  'Barangay Clearance': [text('sitioPurok', 'Sitio / Purok', 200), number('yearsOfResidency', 'Years of residency', 0, 150)],
  'Certificate of Indigency': [text('address', 'Residential address', 300), number('monthlyIncome', 'Monthly income (PHP)', 0, 1e9), number('familyMembers', 'Family members', 1, 100, true), { ...text('reason', 'Reason for assistance', 1000), type: 'textarea' as const }],
  'Business Permit': [text('businessName', 'Business name', 200), text('businessAddress', 'Business address', 300), text('natureOfBusiness', 'Nature of business', 200), text('dtiSecRegNo', 'DTI / SEC registration number', 100)],
  'Building Permit': [...propertyFields, { name: 'constructionType', label: 'Construction type', type: 'select' as const, options: ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Other'].map(value => ({ value, label: value })) }, number('estimatedCost', 'Estimated construction cost (PHP)', 0.01, 1e12), number('floorArea', 'Floor area (square metres)', 0.01, 1e8), text('engineerArchitect', 'Engineer / Architect', 200)],
  'Zoning Clearance': propertyFields,
} satisfies Record<string, FieldSchema[]>;
export type FormType = keyof typeof formSchemas;
export type FormValues = Record<string, string>;
export type FormErrors = Record<string, string>;
export interface SubmissionPayload {
  documentType: FormType; fullName: string; barangay: string; email: string; mobileNumber: string; purpose: string;
  attachments: string[]; details: Record<string, string | number>;
}
export function validateFields(fields: FieldSchema[], values: FormValues): FormErrors {
  const errors: FormErrors = {};
  for (const field of fields) {
    const value = (values[field.name] ?? '').trim();
    if (!value) errors[field.name] = `${field.label} is required.`;
    else if (field.maxLength && value.length > field.maxLength) errors[field.name] = `Use ${field.maxLength} characters or fewer.`;
    else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[field.name] = 'Enter a valid email address.';
    else if (field.type === 'tel' && !/^(?:\+63|0)9\d{9}$/.test(value)) errors[field.name] = 'Enter a Philippine mobile number, such as 09171234567.';
    else if (field.type === 'select' && !field.options?.some(option => option.value === value)) errors[field.name] = `Select a valid ${field.label.toLowerCase()}.`;
    else if (field.type === 'number') {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < field.min! || parsed > field.max!) errors[field.name] = `Enter a number from ${field.min} to ${field.max}.`;
      else if (field.integer && !Number.isInteger(parsed)) errors[field.name] = 'Enter a whole number.';
    }
  }
  return errors;
}
export function submissionPayload(documentType: FormType, values: FormValues): SubmissionPayload {
  const fields = [...applicantFields, ...formSchemas[documentType]];
  if (Object.keys(validateFields(fields, values)).length) throw new Error('Please correct the highlighted fields.');
  const clean = (name: string) => values[name].trim();
  return {
    documentType, fullName: clean('fullName'), barangay: clean('barangay'), email: clean('email'), mobileNumber: clean('mobileNumber'), purpose: clean('purpose'), attachments: [],
    details: Object.fromEntries(formSchemas[documentType].map(field => [field.name, field.type === 'number' ? Number(clean(field.name)) : clean(field.name)])),
  };
}
