import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import SubmissionPaymentStep from '../components/eservices/SubmissionPaymentStep';

export default function PaymentReturn({ outcome }: { outcome: 'success' | 'cancel' | 'failure' }) {
  const [params] = useSearchParams();
  const { user, state, isPasswordRecovery } = useAuth();
  const location = useLocation();
  const id = params.get('submission');
  const validId = id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  return <main className="mx-auto max-w-2xl space-y-6 px-4 py-12">
    <h1 className="text-3xl font-bold">{outcome === 'success' ? 'Verify payment status' : outcome === 'cancel' ? 'Checkout cancelled' : 'Checkout unsuccessful'}</h1>
    {!validId ? <p role="status">This return link does not identify a saved application. Open My submissions to check your status. Payment has not been verified here.</p> : state === 'INITIALIZING' ? <p role="status">Loading your session...</p> : !user || isPasswordRecovery ? <Link className="ui-focus underline" to="/login" state={{ from: location.pathname + location.search }}>Sign in to verify payment</Link> : <SubmissionPaymentStep key={user.id + id} submissionId={id} returnState={outcome} />}
    <Link className="ui-focus inline-block underline font-semibold" to="/e-services?view=submissions">My submissions</Link>
  </main>;
}
