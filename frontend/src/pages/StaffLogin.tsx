import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff, KeyRound, LoaderCircle, ShieldCheck } from 'lucide-react';
import { staffRequest, useStaffAuth } from '../contexts/StaffAuthContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import styles from './StaffLogin.module.css';

type LoginView = 'login' | 'enroll' | 'mfa' | 'backup' | 'forgot' | 'reset';

const viewContent: Record<LoginView, { title: string; description: string; action: string; loading: string }> = {
  login: {
    title: 'Welcome back.',
    description: 'Sign in with your staff account to manage municipal services and content.',
    action: 'Sign in',
    loading: 'Signing in',
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
  const recoveryEnabled = import.meta.env.VITE_STAFF_PASSWORD_RECOVERY_ENABLED === 'true';
  const [token] = useState(() => { const value = new URLSearchParams(location.hash.slice(1)).get('token') || ''; if (value) history.replaceState(null, '', location.pathname); return value; });
  const [view, setView] = useState<LoginView>(token && recoveryEnabled ? 'reset' : 'login');
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
    event.preventDefault();
    if ((view === 'forgot' || view === 'reset') && !recoveryEnabled) {
      setMessageTone('error'); setMessage('Password recovery is temporarily unavailable.'); return;
    }
    setBusy(true); setMessage(''); setMessageTone('error');
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
    <div className={styles.signInPanel}>
    <header className={styles.header}>
      <div className={styles.identity} aria-label={`${appName} staff portal`}>
        <img src="/images/talibon-official-seal.png" alt="Official seal of the Municipality of Talibon" width="40" height="40" className={styles.seal} />
        <p className={styles.wordmark}>Talibon <span>Admin</span></p>
      </div>
      <Link to="/" className={`ui-focus ${styles.publicLink}`}>
        <ArrowLeft size={16} aria-hidden="true" />
        Back to public website
      </Link>
    </header>

    <main className={styles.main} aria-labelledby="staff-login-heading">
      <div className={styles.formColumn}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}><span aria-hidden="true" />Staff portal</p>
          <h1 id="staff-login-heading" ref={headingRef} tabIndex={-1} className={styles.heading}>{content.title}</h1>
          <p className={styles.description}>{content.description}</p>
        </div>

        <form onSubmit={submit} className={styles.form} aria-labelledby="staff-login-heading" aria-busy={busy || undefined}>
          {message && <p role={messageTone === 'error' ? 'alert' : 'status'} aria-atomic="true" className={`${styles.notice} ${messageTone === 'error' ? styles.errorNotice : ''}`}><CircleAlert size={19} aria-hidden="true" /><span>{message}</span></p>}
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
            {['login', 'forgot'].includes(view) && <Input id="staff-email" name="email" label="Staff email" type="email" placeholder="name@talibon.gov.ph" autoComplete="username" autoCapitalize="none" spellCheck={false} value={email} onChange={e => setEmail(e.target.value)} required />}
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
            <Button type="submit" busy={busy} aria-live="polite" className={styles.submit}><span>{busy ? content.loading : content.action}</span>{busy ? <LoaderCircle size={19} className={styles.spinner} aria-hidden="true" /> : <ArrowRight size={19} aria-hidden="true" />}</Button>
          </fieldset>
        </form>

        <div className={styles.secondaryActions}>
          {!['forgot', 'reset'].includes(view) && <Button variant="secondary" disabled={busy || !recoveryEnabled}
            aria-describedby={!recoveryEnabled ? 'recovery-unavailable' : undefined} tabIndex={!recoveryEnabled ? -1 : undefined}
            className={styles.textButton} onClick={() => { setView('forgot'); setEnrollment(null); setPassword(''); setMessage(''); }}>
            {recoveryEnabled ? 'Forgot password?' : 'Forgot your password?'}
          </Button>}
          {view === 'mfa' && !enrollment && <Button variant="secondary" disabled={busy} className={styles.textButton} onClick={() => { setView('backup'); setMessage(''); }}>Use recovery code</Button>}
          {view !== 'login' && <Button variant="secondary" disabled={busy} className={styles.textButton} onClick={() => { setView('login'); setEnrollment(null); setCode(''); setMessage(''); }}>Back to sign in</Button>}
        </div>

        {!recoveryEnabled && <p id="recovery-unavailable" className={styles.recoveryHint}>Ask your system administrator to reset it.</p>}
        <div className={styles.securityNote}>
          <p><ShieldCheck size={18} aria-hidden="true" /><span>Access is limited to approved administrators and editors.</span></p>
          <p><ShieldCheck size={18} aria-hidden="true" /><span>You will be asked for a verification code after you sign in.</span></p>
        </div>
      </div>
    </main>

    <footer className={styles.footer}>
      <Link to="/privacy-policy" className={`ui-focus ${styles.footerLink}`}>Privacy policy</Link>
    </footer>
    </div>
    <aside className={styles.brandPanel} aria-labelledby="staff-brand-heading">
      <p className={styles.locationTag}><span aria-hidden="true" />Municipality of Talibon, Bohol</p>
      <div className={styles.brandContent}>
        <div className={styles.sealTile}><img src="/images/talibon-official-seal.png" alt="" width="104" height="104" /></div>
        <h2 id="staff-brand-heading">Keep Talibon's services running.<span>Securely, together.</span></h2>
        <p className={styles.brandDescription}>Update the municipal website, manage e-services, and review records from one trusted workspace.</p>
        <div className={styles.pills}>
          <span><ShieldCheck size={16} aria-hidden="true" />Verified staff only</span>
          <span><KeyRound size={16} aria-hidden="true" />Two-step verification</span>
        </div>
      </div>
      <div className={styles.brandFooter}><span>Province of Bohol</span><span>Admin portal</span></div>
    </aside>
  </div>;
}
