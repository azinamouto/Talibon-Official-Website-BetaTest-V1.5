import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { AuthLoading } from '../routes/RouteGuards';

export default function AccessDenied() {
  const { user, loading, signOut } = useAuth();
  const [confirm, setConfirm] = useState(false);
  if (loading) return <AuthLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <main className="mx-auto max-w-lg px-4 py-16">
    <Card>
      <h1 className="mb-4 text-3xl font-bold">Access denied</h1>
      <p className="mb-6 text-muted">Your account does not have access to this area. Contact your municipal administrator to request access.</p>
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/" className="ui-focus text-action underline">Go to home page</Link>
        <Button variant="secondary" onClick={() => setConfirm(true)}>Sign out</Button>
      </div>
    </Card>
    <Modal open={confirm} onClose={() => setConfirm(false)} title="Sign out">
      <p className="mb-6">Sign out of your account on this browser?</p>
      <Button onClick={() => { setConfirm(false); void signOut(); }}>Sign out</Button>
    </Modal>
  </main>;
}
