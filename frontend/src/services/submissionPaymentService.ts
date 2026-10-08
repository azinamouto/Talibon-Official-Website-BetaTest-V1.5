import { citizenRequest } from './submissionService';

// Pending S3-BE-02 / S3-INT-01 contract. Keep disabled until backend sign-off.
export const submissionPaymentsEnabled = import.meta.env.VITE_SUBMISSION_PAYMENTS_ENABLED === 'true';
export type PaymentStatus = 'not_required' | 'awaiting_assessment' | 'unpaid' | 'pending' | 'paid' | 'failed' | 'cancelled';
export interface SubmissionPayment { status: PaymentStatus; amount: number; currency: 'PHP'; receiptReference?: string }
export function safeCheckoutUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      !['checkout.xendit.co', 'checkout.stripe.com'].includes(url.hostname)) {
    throw new Error('The payment service returned an unsupported checkout address. Please contact the municipal office.');
  }
  return url.href;
}
export const submissionPaymentService = {
  async get(id: string, signal?: AbortSignal): Promise<SubmissionPayment> {
    if (!submissionPaymentsEnabled) throw new Error('Online payment is not available yet. Your application remains saved.');
    const payment = await citizenRequest<SubmissionPayment>(`payments/submissions/${encodeURIComponent(id)}`, { signal });
    if (!['not_required', 'awaiting_assessment', 'unpaid', 'pending', 'paid', 'failed', 'cancelled'].includes(payment.status) ||
        !Number.isFinite(payment.amount) || payment.amount < 0 || payment.currency !== 'PHP') {
      throw new Error('Payment status could not be verified. Please check again later.');
    }
    return payment;
  },
  async checkout(id: string): Promise<string> {
    if (!submissionPaymentsEnabled) throw new Error('Online payment is not available yet.');
    const query = `?submission=${encodeURIComponent(id)}`;
    const result = await citizenRequest<{ url: string }>('payments/submission-checkout', { method: 'POST', body: JSON.stringify({
      submissionId: id,
      successUrl: `${window.location.origin}/payment/success${query}`,
      cancelUrl: `${window.location.origin}/payment/cancel${query}`,
      failureUrl: `${window.location.origin}/payment/failure${query}`,
    }) });
    return safeCheckoutUrl(result.url);
  },
};
