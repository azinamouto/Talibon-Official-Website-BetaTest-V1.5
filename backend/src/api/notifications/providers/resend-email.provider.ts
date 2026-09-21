import axios from 'axios';
import { EmailProvider, SendEmailOptions, SendEmailResult } from '../email-provider.interface';
export class ResendEmailProvider implements EmailProvider {
  name = 'Resend';
  private readonly apiKey = (process.env.RESEND_API_KEY || '').trim();
  private readonly fromAddress = (process.env.EMAIL_FROM_ADDRESS || '').trim();
  private readonly fromName = (process.env.EMAIL_FROM_NAME || 'Digital Talibon').trim();
  isConfigured() { return this.apiKey.length > 5 && this.fromAddress.includes('@'); }
  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.isConfigured()) return { success: false, error: 'provider_not_configured' };
    try {
      const response = await axios.post('https://api.resend.com/emails', {
        from: `${this.fromName} <${this.fromAddress}>`, to: [options.to],
        subject: options.subject, html: options.html, text: options.text,
      }, { headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json',
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      }, timeout: 10000 });
      if (typeof response.data?.id === 'string') return { success: true, messageId: response.data.id };
      return { success: false, error: 'provider_invalid_response' };
    } catch (error: unknown) {
      // Provider bodies can contain addresses or credentials; store only a safe code.
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      return { success: false, error: status ? `provider_http_${status}` : 'provider_network_error' };
    }
  }
}
