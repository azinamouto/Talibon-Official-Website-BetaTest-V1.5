import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { staffRequest, useStaffAuth } from '../contexts/StaffAuthContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import styles from './StaffLogin.module.css';

type LoginView = 'login' | 'enroll' | 'mfa' | 'backup' | 'forgot' | 'reset';

const viewContent: Record<LoginView, { title: string; description: string; action: string; loading: string }> = {
  login: {
    title: 'Staff sign in',
    description: 'Use your staff account to access the administration portal.',
    action: 'Sign in',
    loading: 'Signing in…',
  },
  enroll: {
    title: 'Set up multi-factor authentication',
    description: 'Confirm your password to set up an authenticator for your staff account.',
    action: 'Set up MFA',
    loading: 'Setting up MFA…',
  },
  mfa: {
    title: 'Verify your identity',
    description: 'Enter the code from your authenticator app to complete sign in.',
    action: 'Continue',
    loading: 'Verifying code…',
  },
  backup: {
    title: 'Use a recovery code',
    description: 'Enter one of your saved, one-use recovery codes to complete sign in.',
    action: 'Continue',
    loading: 'Verifying code…',
  },
  forgot: {
    title: 'Reset your password',
    description: 'Enter your staff email to request password recovery instructions.',
    action: 'Request recovery',
    loading: 'Requesting recovery…',
  },
  reset: {
    title: 'Set a new password',
    description: 'Choose a new password for your staff account.',
    action: 'Reset password',
    loading: 'Resetting password…',
  },
};

export default function StaffLogin() {
  const navigate = useNavigate();
  const { refresh } = useStaffAuth();
  const { appName } = useAppConfig();
  const [token] = useState(() => { const value = new URLSearchParams(location.hash.slice(1)).get('token') || ''; if (value) history.replaceState(null, '', location.pathname); return value; });
  const [view, setView] = useState<LoginView>(token ? 'reset' : 'login');
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [code, setCode] = useState(''); const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState<'error' | 'success'>('error');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [enrollment, setEnrollment] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousView = useRef(view);
  const content = viewContent[view];

  useEffect(() => {
    if (previousView.current !== view) {
      setShowPassword(false);
      headingRef.current?.focus();
      previousView.current = view;
    }
  }, [view]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage(''); setMessageTone('error');
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
        setMessageTone('success');
        setMessage('If the account is eligible, recovery instructions will be sent.');
      } else {
        await staffRequest('/api/staff-auth/reset-password', { token, newPassword: password });
        setMessageTone('success');
        setPassword(''); setView('login'); setMessage('Password reset. Sign in and complete MFA.');
      }
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <div className={styles.page}>
    <header className={styles.header}>
      <div className={styles.identity}>
        <img src="/images/talibon-official-seal.png" alt="Official seal of the Municipality of Talibon" width="56" height="56" className={styles.seal} />
        <div>
          <p className={styles.municipality}>Municipality of Talibon</p>
          <p className={styles.portal}>{appName} · Staff portal</p>
        </div>
      </div>
      <Link to="/" className={`ui-focus ${styles.publicLink}`}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to public website
      </Link>
    </header>

    <main className={styles.main} aria-labelledby="staff-login-heading">
      <div className={styles.formColumn}>
        <div className={styles.intro}>
          <h1 id="staff-login-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>{content.title}</h1>
          <p className={styles.description}>{content.description}</p>
        </div>

        <form onSubmit={submit} className={styles.form} aria-labelledby="staff-login-heading" aria-busy={busy || undefined}>
          {message && <p role={messageTone === 'error' ? 'alert' : 'status'} aria-atomic="true" className={`${styles.notice} ${messageTone === 'error' ? styles.errorNotice : ''}`}>{message}</p>}
          {enrollment && <section className={styles.enrollment} aria-labelledby="authenticator-setup-heading">
            <h2 id="authenticator-setup-heading">Set up your authenticator</h2>
            <p>Enter this secret in your authenticator app. Save the one-use recovery codes securely before continuing.</p>
            <dl className={styles.enrollmentDetails}>
              <div>
                <dt>Setup key</dt>
                <dd><code>{new URL(enrollment.totpURI).searchParams.get('secret')}</code></dd>
              </div>
              <div>
                <dt>One-use recovery codes</dt>
                <dd><ul className={styles.recoveryCodes}>{enrollment.backupCodes.map(backupCode => <li key={backupCode}><code>{backupCode}</code></li>)}</ul></dd>
              </div>
            </dl>
          </section>}

          <fieldset disabled={busy} className={styles.fields}>
            <legend className="sr-only">{content.title}</legend>
            {['login', 'forgot'].includes(view) && <Input id="staff-email" name="email" label="Staff email" type="email" placeholder="you@example.com" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} required />}
            {['login', 'enroll', 'reset'].includes(view) && <div>
              <div className={styles.passwordField}>
                <Input id="staff-password" name="password" label={view === 'reset' ? 'New password' : 'Password'} type={showPassword ? 'text' : 'password'} placeholder={view === 'reset' ? 'Create a new password' : 'Enter your password'} autoComplete={view === 'reset' ? 'new-password' : 'current-password'} autoCapitalize="none" spellCheck={false} minLength={view === 'reset' ? 14 : undefined} aria-describedby={view === 'reset' ? 'password-requirements' : undefined} value={password} onChange={e => setPassword(e.target.value)} className={styles.passwordInput} required />
                <button type="button" className={`ui-focus ${styles.passwordToggle}`} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-controls="staff-password" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>
                  {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>
              </div>
              {view === 'reset' && <p id="password-requirements" className={styles.hint}>Use at least 14 characters.</p>}
            </div>}
            {['mfa', 'backup'].includes(view) && <Input id="staff-code" name="code" label={view === 'backup' ? 'Recovery code' : 'Authenticator code'} placeholder={view === 'backup' ? 'Enter a recovery code' : 'Enter the code from your app'} inputMode={view === 'mfa' ? 'numeric' : 'text'} autoComplete="one-time-code" autoCapitalize="none" spellCheck={false} value={code} onChange={e => setCode(e.target.value)} required />}
            <Button type="submit" busy={busy} aria-live="polite" className={styles.submit}>{busy ? content.loading : content.action}</Button>
          </fieldset>
        </form>

        <div className={styles.secondaryActions}>
          {!['forgot', 'reset'].includes(view) && <Button variant="secondary" disabled={busy} className={styles.textButton} onClick={() => { setView('forgot'); setEnrollment(null); setPassword(''); setMessage(''); }}>Forgot password?</Button>}
          {view === 'mfa' && !enrollment && <Button variant="secondary" disabled={busy} className={styles.textButton} onClick={() => { setView('backup'); setMessage(''); }}>Use recovery code</Button>}
          {view !== 'login' && <Button variant="secondary" disabled={busy} className={styles.textButton} onClick={() => { setView('login'); setEnrollment(null); setCode(''); setMessage(''); }}>Back to sign in</Button>}
        </div>

        <p className={styles.securityNote}>For approved administrators and editors. Multi-factor authentication is required.</p>
      </div>
    </main>

    <footer className={styles.footer}>
      <p>Municipality of Talibon · Province of Bohol</p>
      <Link to="/privacy-policy" className={`ui-focus ${styles.footerLink}`}>Privacy policy</Link>
    </footer>
  </div>;
}
