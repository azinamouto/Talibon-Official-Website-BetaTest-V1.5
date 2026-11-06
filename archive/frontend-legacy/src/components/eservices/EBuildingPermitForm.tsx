import FormWizard, { type FormWizardProps } from './FormWizard';

export default function EBuildingPermitForm(props: Omit<FormWizardProps, 'documentType'>) {
  return <FormWizard {...props} documentType="Building Permit" />;
}
