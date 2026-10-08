import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { submissionPaymentsEnabled, submissionPaymentService, type SubmissionPayment } from '../../services/submissionPaymentService';

export default function SubmissionPaymentStep({ submissionId, returnState }: { submissionId: string; returnState?: 'success' | 'cancel' | 'failure' }) {
  const [payment, setPayment] = useState<SubmissionPayment | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const checkoutLock = useRef(false);
  useEffect(() => {
    if (!submissionPaymentsEnabled) return;
    const controller = new AbortController();
    setBusy(true); setPayment(null); setError('');
    void submissionPaymentService.get(submissionId, controller.signal).then(result => {
      if (!controller.signal.aborted) setPayment(result);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [submissionId, refresh]);
  const checkout = async () => {
    if (checkoutLock.current) return;
    checkoutLock.current = true; setBusy(true); setError('');
    try { window.location.assign(await submissionPaymentService.checkout(submissionId)); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to open checkout.'); }
    finally { checkoutLock.current = false; setBusy(false); }
  };
  const messages = {
    not_required: 'No payment is required for this application.',
    awaiting_assessment: 'Your application is awaiting fee assessment. Check back after the municipal office reviews it.',
    unpaid: 'Payment is due. Continue to the payment provider to pay securely.',
    pending: 'Payment confirmation is pending. Check status again before making another payment.',
    paid: 'Payment confirmed by the payment service.',
    failed: 'Payment failed. Your application remains saved. You can retry checkout.',
    cancelled: 'Checkout was cancelled. Your application remains saved. You can retry checkout.',
  };
  return <section aria-label="Application payment" className="space-y-4 rounded-xl border border-brand-border bg-slate-50 p-5">
    <h3 className="text-xl font-bold">Payment</h3>
    {returnState && <p>{returnState === 'success' ? 'You have returned from checkout. Payment is only complete when confirmed below.' : returnState === 'cancel' ? 'You cancelled checkout. Check the current payment status below.' : 'Checkout did not complete. Check the current payment status below.'}</p>}
    {!submissionPaymentsEnabled ? <p role="status">Online payment is not available yet. Your application remains saved. Contact the municipal office for payment instructions.</p> : <>
      {busy && <p role="status">Checking payment service...</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {payment && <div role="status" className="space-y-2">
        <p>{messages[payment.status]}</p>
        {!['not_required', 'awaiting_assessment'].includes(payment.status) && <p className="font-bold">Assessed amount: {new Intl.NumberFormat('en-PH', { style: 'currency', currency: payment.currency }).format(payment.amount)}</p>}
        {payment.status === 'paid' && payment.receiptReference && <p className="break-all">Receipt reference: {payment.receiptReference}</p>}
      </div>}
      <div className="flex flex-wrap gap-3">
        {payment && ['unpaid', 'failed', 'cancelled'].includes(payment.status) && <Button busy={busy} onClick={checkout}>Continue to secure checkout</Button>}
        <Button variant="secondary" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Check payment status</Button>
      </div>
    </>}
    <p className="text-sm text-slate-600">Payment details are entered on the provider’s website. This application does not collect or store card details.</p>
    <Link className="ui-focus inline-block font-semibold underline" to={`/e-services?track=${encodeURIComponent(submissionId)}`}>View submission status</Link>
  </section>;
}
