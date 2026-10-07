import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { useAppConfig } from '../contexts/AppConfigContext';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { AuthLoading, safeReturnPath, STAFF_ROLES } from '../routes/RouteGuards';

export default function Login() {
  const auth = useAuth();
  const { appName } = useAppConfig();
  const location = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>(() =>
    new URLSearchParams(location.search).get('type') === 'recovery' || location.hash.includes('type=recovery') ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const destination = safeReturnPath(location.state?.from);
  useEffect(() => { if (auth.isPasswordRecovery) setView('reset'); }, [auth.isPasswordRecovery]);

  const changeView = (next: typeof view) => { setView(next); setError(''); setMessage(''); setPassword(''); };
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const result = view === 'login' ? await auth.signInWithEmail(email.trim(), password)
        : view === 'register' ? await auth.signUpWithEmail(email.trim(), password)
        : view === 'forgot' ? await auth.resetPasswordForEmail(email.trim())
        : await auth.updatePassword(password);
      if (result.error) throw result.error;
      if (view === 'register') {
        changeView('login');
        setMessage('Check your email to confirm your account. Staff access requires administrator approval.');
      } else if (view === 'forgot') {
        setMessage('If this email has an account, a password reset link will be sent.');
      } else if (view === 'reset') {
        setPassword(''); setView('login');
        navigate('/login', { replace: true });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete your request. Please try again.');
    } finally { setBusy(false); }
  }
  const recovering = view === 'reset' || auth.isPasswordRecovery;
  if (auth.loading && !recovering) return <AuthLoading />;
  if (auth.user && !recovering && !busy && view !== 'register') {
    if (auth.state === 'ERROR') return <div className="mx-auto max-w-lg p-6">
      <Alert tone="error">Your account could not be loaded. Check your connection.</Alert>
      <Button className="mt-4" onClick={() => void auth.refreshProfile()}>Try again</Button>
      <Button variant="secondary" className="ml-4" onClick={() => void auth.signOut()}>Sign out</Button>
    </div>;
    return <Navigate to={auth.profile?.is_verified && auth.profile.is_active !== false && STAFF_ROLES.includes(auth.profile.role) ? destination : '/access-denied'} replace />;
  }
  const title = view === 'register' ? 'Create an account' : view === 'forgot' ? 'Reset your password' : view === 'reset' ? 'Choose a new password' : 'Sign in';
  return <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-12">
    <Card className="w-full space-y-6">
      <Link to="/" className="ui-focus text-action underline">Back to {appName}</Link>
      <h1 className="text-3xl font-bold">{title}</h1>
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}
      <form onSubmit={submit} className="space-y-5">
        {view !== 'reset' && <Input label="Email address" name="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required />}
        {view !== 'forgot' && <Input label={view === 'reset' ? 'New password' : 'Password'} name="password" type="password"
          autoComplete={view === 'login' ? 'current-password' : 'new-password'} minLength={view === 'login' ? undefined : 8}
          value={password} onChange={e => setPassword(e.target.value)} required hint={view === 'login' ? undefined : 'Use at least 8 characters.'} />}
        <Button type="submit" busy={busy} className="w-full">{busy ? 'Please wait...' : title}</Button>
      </form>
      <div className="flex flex-wrap gap-3">
        {view === 'login' ? <>
          <Button variant="secondary" onClick={() => changeView('forgot')}>Forgot password?</Button>
          <Button variant="secondary" onClick={() => changeView('register')}>Create account</Button>
        </> : <Button variant="secondary" onClick={() => changeView('login')}>Back to sign in</Button>}
      </div>
    </Card>
  </main>;
}
