import FormWizard, { type FormWizardProps } from './FormWizard';

export default function EBusinessPermitForm(props: Omit<FormWizardProps, 'documentType'>) {
  return <FormWizard {...props} documentType="Business Permit" />;
}
