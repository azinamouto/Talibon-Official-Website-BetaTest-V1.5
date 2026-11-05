import sectionTheme from "../styles/SectionTheme.module.css";
﻿import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useStaffAuth } from '../contexts/StaffAuthContext';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';

export default function AccessDenied() {
  const { staff, loading, signOut } = useStaffAuth();
  const [confirm, setConfirm] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  if (loading) return <div role="status" className="p-12 text-center text-ink">Checking your staff session...</div>;
  if (!staff) return <Navigate to="/staff/login" replace />;
  return <main className={`${sectionTheme.section} mx-auto max-w-lg px-4 py-16`}>
    <Card>
      <h1 className="mb-4 text-3xl font-bold">Access denied</h1>
      <p className="mb-6 text-muted">Your account does not have access to this area. Contact your municipal administrator to request access.</p>
      {signOutError && <p role="alert" className="mb-4 text-sm text-red-700">Sign out could not be confirmed. Please try again.</p>}
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/" className="ui-focus text-action underline">Go to home page</Link>
        <Button variant="secondary" onClick={() => setConfirm(true)}>Sign out</Button>
      </div>
    </Card>
    <Modal className={sectionTheme.section} open={confirm} onClose={() => setConfirm(false)} title="Sign out">
      <p className="mb-6">Sign out of your account on this browser?</p>
      <Button onClick={() => { setConfirm(false); void signOut().catch(() => setSignOutError(true)); }}>Sign out</Button>
    </Modal>
  </main>;
}
