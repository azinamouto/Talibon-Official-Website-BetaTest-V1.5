import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { applicantFields, formSchemas, submissionPayload, validateFields, type FieldSchema, type FormType, type FormValues, type FormErrors } from './formSchema';
import { submissionService, type Submission } from '../../services/submissionService';
import SubmissionPaymentStep from './SubmissionPaymentStep';

export interface FormWizardProps { documentType: FormType; onSuccess?: (result: Submission) => void }
const steps = ['Applicant details', 'Service details', 'Review', 'Payment & status'];
export default function FormWizard({ documentType, onSuccess }: FormWizardProps) {
  const { user, profile, state, isPasswordRecovery } = useAuth();
  const location = useLocation();
  const prefix = useId();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormValues>({ email: user?.email ?? '', fullName: profile?.full_name ?? '', barangay: profile?.barangay_id ?? '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Submission | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLDivElement>(null);
  const lock = useRef(false);
  const fields = [...applicantFields, ...formSchemas[documentType]];
  useEffect(() => { heading.current?.focus(); }, [step]);
  useEffect(() => { if (error || Object.keys(errors).length) summary.current?.focus(); }, [error, errors]);
  useEffect(() => { setValues(previous => ({ ...previous, email: user?.email ?? '' })); }, [user?.email]);
  const check = (selected: FieldSchema[]) => {
    const nextErrors = validateFields(selected, values);
    setErrors(nextErrors); setError('');
    return !Object.keys(nextErrors).length;
  };
  const submit = async () => {
    if (lock.current || saved) return;
    if (!check(fields)) { setStep(Object.keys(validateFields(applicantFields, values)).length ? 0 : 1); return; }
    if (!confirmed) { setError('Confirm that you have reviewed your application before submitting.'); return; }
    lock.current = true; setBusy(true);
    try {
      const result = await submissionService.submit(submissionPayload(documentType, values));
      if (!result.id || !result.ticketId) throw new Error('Unable to confirm the saved application. Check My submissions before retrying.');
      setSaved(result); setStep(3);
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to submit. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  };
  const renderField = (field: FieldSchema) => {
    const id = `${prefix}-${field.name}`;
    const change = (value: string) => {
      setValues(previous => ({ ...previous, [field.name]: value }));
      setConfirmed(false);
      setErrors(previous => { const next = { ...previous }; delete next[field.name]; return next; });
    };
    const shared = { id, name: field.name, value: values[field.name] ?? '', required: true, 'aria-invalid': !!errors[field.name], 'aria-describedby': [field.hint && `${id}-hint`, errors[field.name] && `${id}-error`].filter(Boolean).join(' ') || undefined };
    if (field.type !== 'select' && field.type !== 'textarea') return <Input key={field.name} {...shared} label={field.label} type={field.type ?? 'text'} hint={field.hint} error={errors[field.name]} autoComplete={field.autoComplete} readOnly={field.name === 'email'} min={field.min} max={field.max} step={field.integer ? 1 : 'any'} maxLength={field.maxLength} onChange={event => change(event.target.value)} />;
    return <div key={field.name} className="space-y-2">
      <label htmlFor={id} className="block font-semibold">{field.label}</label>
      {field.type === 'select' ? <select {...shared} className="ui-focus min-h-11 w-full rounded-control border border-control bg-white p-3" onChange={event => change(event.target.value)}>
        <option value="">Select {field.label.toLowerCase()}</option>{field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select> : <textarea {...shared} rows={3} maxLength={field.maxLength} className="ui-focus w-full rounded-control border border-control bg-white p-3" onChange={event => change(event.target.value)} />}
      {field.hint && <p id={`${id}-hint`} className="text-sm text-slate-600">{field.hint}</p>}
      {errors[field.name] && <p id={`${id}-error`} className="text-sm text-danger">{errors[field.name]}</p>}
    </div>;
  };
  if (state === 'INITIALIZING') return <p role="status">Loading your session...</p>;
  if (!user || isPasswordRecovery) return <div className="space-y-4 rounded-xl border p-6"><h2 className="text-xl font-bold">Sign in to apply</h2><p>Use your account to submit and track your {documentType.toLowerCase()}.</p><Link to="/login" state={{ from: location.pathname + location.search }} className="ui-focus underline font-semibold">Sign in</Link></div>;
  return <section aria-label={`${documentType} application`} className="space-y-6">
    <h2 className="text-2xl font-bold">{documentType}</h2>
    <ol aria-label="Application progress" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {steps.map((label, index) => <li key={label} aria-current={step === index ? 'step' : undefined} className={`rounded-lg border p-3 text-sm ${step === index ? 'border-action bg-blue-50 font-bold' : 'border-brand-border'}`}>{index + 1}. {label}{step > index && <span className="block">Complete</span>}</li>)}
    </ol>
    <h3 ref={heading} tabIndex={-1} className="text-xl font-semibold">Step {step + 1} of {steps.length}: {steps[step]}</h3>
    {(error || Object.keys(errors).length > 0) && <div ref={summary} role="alert" tabIndex={-1} className="rounded-lg border border-red-300 bg-red-50 p-4 text-danger">
      <p>{error || 'Please correct the following fields:'}</p>
      <ul>{Object.entries(errors).map(([name, message]) => <li key={name}><a href={`#${prefix}-${name}`} onClick={event => { event.preventDefault(); document.getElementById(`${prefix}-${name}`)?.focus(); }} className="underline">{fields.find(field => field.name === name)?.label}: {message}</a></li>)}</ul>
      {error && <Link to="/e-services?view=submissions" className="underline">My submissions</Link>}
    </div>}
    {step < 3 ? <form noValidate onSubmit={event => { event.preventDefault(); if (busy) return; if (step < 2) { if (check(step === 0 ? applicantFields : formSchemas[documentType])) setStep(step + 1); } else void submit(); }}>
      <fieldset disabled={busy} className="space-y-5">
        <legend className="sr-only">{steps[step]} — all fields required</legend>
        {step < 2 ? <><p className="text-sm text-slate-600">All fields are required.</p><div className="grid gap-5 sm:grid-cols-2">{(step === 0 ? applicantFields : formSchemas[documentType]).map(renderField)}</div></> : <>
          <dl className="grid gap-4 sm:grid-cols-2">{fields.map(field => <div key={field.name}><dt className="text-sm text-slate-600">{field.label}</dt><dd className="break-words whitespace-pre-wrap font-medium">{field.options?.find(option => option.value === values[field.name])?.label ?? values[field.name]}</dd></div>)}</dl>
          <p className="text-sm text-slate-600">Supporting documents may be requested during review. This form does not upload files. Any fees will be assessed separately.</p>
          <label className="flex items-start gap-3"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="ui-focus mt-1 h-5 w-5 shrink-0" />I have reviewed this application and confirm that the information is correct.</label>
        </>}
        <div className="flex flex-wrap gap-3 pt-3">
          {step > 0 && <Button variant="secondary" onClick={() => { setStep(step - 1); setErrors({}); setError(''); }}>Back</Button>}
          <Button type="submit" busy={busy}>{busy ? 'Submitting application...' : step === 2 ? 'Submit application' : 'Continue'}</Button>
        </div>
      </fieldset>
    </form> : saved && <div className="space-y-5">
      <div role="status" className="rounded-xl border border-green-300 bg-green-50 p-5"><p className="font-bold">Application submitted</p><p className="break-all">Ticket: {saved.ticketId}</p><p>Status: {saved.status}</p></div>
      <SubmissionPaymentStep submissionId={saved.id} />
      {onSuccess && <Button onClick={() => onSuccess(saved)}>Finish</Button>}
    </div>}
  </section>;
}
