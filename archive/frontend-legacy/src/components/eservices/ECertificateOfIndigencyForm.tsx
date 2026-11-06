import FormWizard, { type FormWizardProps } from './FormWizard';

export default function ECertificateOfIndigencyForm(props: Omit<FormWizardProps, 'documentType'>) {
  return <FormWizard {...props} documentType="Certificate of Indigency" />;
}
