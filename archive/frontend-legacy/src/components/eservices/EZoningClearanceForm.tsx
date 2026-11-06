import FormWizard, { type FormWizardProps } from './FormWizard';

export default function EZoningClearanceForm(props: Omit<FormWizardProps, 'documentType'>) {
  return <FormWizard {...props} documentType="Zoning Clearance" />;
}
