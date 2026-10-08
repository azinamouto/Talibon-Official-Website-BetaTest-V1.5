import FormWizard, { type FormWizardProps } from './FormWizard';

export default function EBarangayClearanceForm(props: Omit<FormWizardProps, 'documentType'>) {
  return <FormWizard {...props} documentType="Barangay Clearance" />;
}
