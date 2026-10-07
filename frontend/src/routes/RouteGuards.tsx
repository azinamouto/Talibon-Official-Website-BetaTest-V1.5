import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, type OfficialRole } from '../contexts/SupabaseAuthContext';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

export const STAFF_ROLES: readonly OfficialRole[] = ['super_admin', 'admin', 'municipal_admin', 'department_admin', 'barangay_admin', 'editor'];
export function AuthLoading() {
  return <div role="status" className="p-12 text-center text-ink">Loading your session...</div>;
}
export function ProtectedRoute({ roles }: { roles?: readonly OfficialRole[] }) {
  const { user, profile, state, isPasswordRecovery, refreshProfile } = useAuth();
  const location = useLocation();
  if (state === 'INITIALIZING') return <AuthLoading />;
  if (state === 'ERROR') return <div className="mx-auto max-w-xl p-6">
    <Alert tone="error">We could not verify your account. Check your connection and try again.</Alert>
    <Button className="mt-4" onClick={() => user ? void refreshProfile() : window.location.reload()}>Try again</Button>
  </div>;
  if (!user || isPasswordRecovery) return <Navigate to="/login" replace state={{ from: location.pathname + location.search + location.hash }} />;
  if (!profile?.is_verified || profile.is_active === false || (roles && !roles.includes(profile.role))) {
    return <Navigate to="/access-denied" replace />;
  }
  return <Outlet />;
}

/** Reject external/protocol-relative URLs and auth pages as return destinations. */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\s]/.test(value)) return '/admin';
  const path = value.split(/[?#]/)[0].toLowerCase();
  if (path === '/login' || path.startsWith('/auth/')) return '/admin';
  return value;
}
