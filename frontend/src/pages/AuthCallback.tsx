import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Alert } from '../components/ui/Alert';
import { AuthLoading } from '../routes/RouteGuards';

export default function AuthCallback() {
  const { loading, user, state, isPasswordRecovery } = useAuth();
  if (loading) return <AuthLoading />;
  if (state === 'ERROR' || !user) return <main className="mx-auto max-w-lg p-6">
    <Alert tone="error">This authentication link is invalid or has expired. Request a new link from the sign-in page.</Alert>
    <a href="/login" className="ui-focus mt-4 inline-block text-action underline">Return to sign in</a>
  </main>;
  return <Navigate to={isPasswordRecovery ? '/login?type=recovery' : '/login'} replace />;
}
