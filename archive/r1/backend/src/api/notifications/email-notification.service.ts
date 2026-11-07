import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../supabase.service';
import { ResendEmailProvider } from './providers/resend-email.provider';

interface EmailJob {
  id: string; lease_token: string; attempts: number;
  payload: { email: string; fullName: string; ticketId: string; documentType: string; status: string; remarks: string; subject: string; body: string };
}
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
export function renderFormEmail(job: EmailJob, appUrl: string) {
  const values: Record<string, string> = { ...job.payload, trackingUrl: `${appUrl.replace(/\/$/, '')}/e-services?track=${encodeURIComponent(job.payload.ticketId)}` };
  const render = (template: string) => template.replace(/\{\{(fullName|ticketId|documentType|status|remarks|trackingUrl)\}\}/g, (_, key: string) => values[key] ?? '');
  const subject = render(job.payload.subject).replace(/[\r\n]/g, ' ').slice(0, 200);
  const text = render(job.payload.body);
  return { to: job.payload.email, subject, text, html: `<div style="white-space:pre-wrap">${escapeHtml(text)}</div>`, idempotencyKey: `form-email-${job.id}` };
}
@Injectable()
export class EmailNotificationService {
  private readonly logger = new Logger('FormEmailWorker');
  private readonly provider = new ResendEmailProvider();
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  async processPending(limit = 10) {
    const appUrl = process.env.APP_URL;
    // Fail before claiming jobs if delivery is not configured. Console output is not delivery.
    if (!this.provider.isConfigured() || !appUrl || !/^https?:\/\//.test(appUrl)) {
      throw new ServiceUnavailableException('Email delivery configuration is incomplete.');
    }
    const client = this.supabase.getClient();
    let processed = 0, sent = 0;
    for (let i = 0; i < Math.min(Math.max(limit, 1), 10); i++) {
      const { data, error } = await client.rpc('claim_form_email');
      if (error) throw new ServiceUnavailableException('Email queue is unavailable.');
      const job = (data as EmailJob[] | null)?.[0];
      if (!job) break;
      let result;
      try { result = await this.provider.sendEmail(renderFormEmail(job, appUrl)); }
      catch { result = { success: false, error: 'provider_exception' }; }
      const { data: finished, error: finishError } = await client.rpc('finish_form_email', {
        p_id: job.id, p_token: job.lease_token, p_success: result.success,
        p_message_id: result.messageId ?? null, p_error: result.success ? null : result.error ?? 'delivery_failed',
      });
      if (finishError || !finished) {
        this.logger.error(`Email job ${job.id}: delivery acknowledgement failed; lease recovery will retry.`);
        throw new ServiceUnavailableException('Email delivery acknowledgement failed.');
      }
      processed++;
      if (result.success) sent++;
      else this.logger.warn(`Email job ${job.id}: attempt ${job.attempts} failed; outcome persisted.`);
    }
    return { processed, sent, failed: processed - sent };
  }
}
