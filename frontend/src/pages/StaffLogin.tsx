import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { staffRequest, useStaffAuth } from '../contexts/StaffAuthContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export default function StaffLogin() {
  const navigate = useNavigate();
  const { refresh } = useStaffAuth();
  const [token] = useState(() => { const value = new URLSearchParams(location.hash.slice(1)).get('token') || ''; if (value) history.replaceState(null, '', location.pathname); return value; });
  const [view, setView] = useState(token ? 'reset' : 'login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [code, setCode] = useState(''); const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (view === 'login') {
        const result = await staffRequest<{ mfaRequired?: boolean }>('/api/staff-auth/sign-in/email', { email, password });
        setPassword(''); setView(result.mfaRequired ? 'mfa' : 'enroll');
      } else if (view === 'enroll') {
        setEnrollment(await staffRequest<{ totpURI: string; backupCodes: string[] }>('/api/staff-auth/two-factor/enable', { password }));
        setPassword(''); setView('mfa');
      } else if (view === 'mfa' || view === 'backup') {
        await staffRequest(`/api/staff-auth/two-factor/${view === 'backup' ? 'verify-backup-code' : 'verify-totp'}`, { code });
        setCode(''); setEnrollment(null); await refresh(); navigate('/admin', { replace: true });
      } else if (view === 'forgot') {
        await staffRequest('/api/staff-auth/request-password-reset', { email });
        setMessage('If the account is eligible, recovery instructions will be sent.');
      } else {
        await staffRequest('/api/staff-auth/reset-password', { token, newPassword: password });
        setPassword(''); setView('login'); setMessage('Password reset. Sign in and complete MFA.');
      }
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-lg space-y-5 px-5 py-12">
    <Link to="/" className="underline">Back to public website</Link>
    <h1 className="text-3xl font-bold">Staff sign in</h1>
    <p>For approved administrators and editors. Multi-factor authentication is required.</p>
    {message && <p role="status">{message}</p>}
    {enrollment && <section className="space-y-3 rounded border p-4">
      <h2 className="font-bold">Set up your authenticator</h2>
      <p>Enter this secret in your authenticator app. Save the one-use recovery codes securely before continuing.</p>
      <code className="block break-all">{new URL(enrollment.totpURI).searchParams.get('secret')}</code>
      <p className="break-words font-mono">{enrollment.backupCodes.join(' · ')}</p>
    </section>}
    <form onSubmit={submit} className="space-y-4">
      {['login','forgot'].includes(view) && <Input label="Staff email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required />}
      {['login','enroll','reset'].includes(view) && <Input label={view === 'reset' ? 'New password' : 'Password'} type="password" autoComplete={view === 'reset' ? 'new-password' : 'current-password'} minLength={view === 'reset' ? 14 : undefined} value={password} onChange={e=>setPassword(e.target.value)} required />}
      {['mfa','backup'].includes(view) && <Input label={view === 'backup' ? 'Recovery code' : 'Authenticator code'} autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value)} required />}
      <Button type="submit" busy={busy}>{view === 'enroll' ? 'Set up MFA' : view === 'forgot' ? 'Request recovery' : 'Continue'}</Button>
    </form>
    <div className="flex gap-4">
      <Button variant="secondary" onClick={()=>{setView('forgot');setEnrollment(null);setPassword('');}}>Forgot password?</Button>
      {view === 'mfa' && !enrollment && <Button variant="secondary" onClick={()=>setView('backup')}>Use recovery code</Button>}
      {view !== 'login' && <Button variant="secondary" onClick={()=>{setView('login');setEnrollment(null);setCode('');}}>Back to sign in</Button>}
    </div>
  </main>;
}
