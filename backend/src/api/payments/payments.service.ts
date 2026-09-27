import { Injectable, InternalServerErrorException, BadRequestException, ServiceUnavailableException, Logger } from "@nestjs/common";
import { randomUUID } from 'node:crypto';
import { Xendit } from "xendit-node";
import { CreateInvoiceRequest } from "xendit-node/invoice/models/CreateInvoiceRequest";

const MIN_AMOUNT = 1;
const MAX_AMOUNT = 1_000_000;

@Injectable()
export class PaymentsService {
  private xenditClient: Xendit | null = null;
  private readonly logger = new Logger(PaymentsService.name);

  private returnUrl(value: string | undefined, path: string): string {
    let configured: URL;
    try {
      configured = new URL(process.env.PAYMENT_RETURN_ORIGIN || '');
      const localHttp = process.env.NODE_ENV !== 'production' && configured.protocol === 'http:' &&
        ['localhost', '127.0.0.1', '[::1]'].includes(configured.hostname);
      if ((configured.protocol !== 'https:' && !localHttp) || configured.username || configured.password ||
          configured.pathname !== '/' || configured.search || configured.hash) throw new Error();
    } catch {
      throw new ServiceUnavailableException('Payment return origin is not configured.');
    }
    if (value === undefined) return new URL(path, configured.origin).href;
    try {
      const target = new URL(value);
      if (target.origin !== configured.origin || target.username || target.password) throw new Error();
      return target.href;
    } catch {
      throw new BadRequestException('Payment return URL must use the configured website origin.');
    }
  }

  private get client() {
    if (!this.xenditClient) {
      const secretKey = process.env.XENDIT_SECRET_KEY;
      if (!secretKey) {
        throw new InternalServerErrorException(
          "Xendit payment gateway is not configured. Please set XENDIT_SECRET_KEY in environment variables."
        );
      }
      this.xenditClient = new Xendit({ secretKey });
    }
    return this.xenditClient;
  }

  async createCheckoutSession(
    itemName: string,
    amount: number,
    successUrl?: string,
    cancelUrl?: string
  ) {
    if (!itemName || typeof itemName !== "string" || itemName.trim().length === 0) {
      throw new BadRequestException("Item name is required.");
    }

    if (!Number.isFinite(amount) || amount < MIN_AMOUNT || amount > MAX_AMOUNT) {
      throw new BadRequestException(
        `Amount must be between ₱${MIN_AMOUNT} and ₱${MAX_AMOUNT.toLocaleString()}.`
      );
    }

    const roundedAmount = Math.round(amount * 100) / 100;
    const externalId = `talibon-pay-${randomUUID()}`;
    const successRedirectUrl = this.returnUrl(successUrl, '/payment/success');
    const failureRedirectUrl = this.returnUrl(cancelUrl, '/payment/cancel');

    try {
      const invoiceRequest: CreateInvoiceRequest = {
        externalId: externalId,
        amount: roundedAmount,
        currency: "PHP",
        description: itemName.trim().slice(0, 200),
        successRedirectUrl,
        failureRedirectUrl,
        items: [
          {
            name: itemName.trim().slice(0, 200),
            quantity: 1,
            price: roundedAmount,
          }
        ],
        fees: []
      };

      const response = await this.client.Invoice.createInvoice({
        data: invoiceRequest
      });

      if (!response?.invoiceUrl) {
        throw new InternalServerErrorException("Invalid response from Xendit payment gateway.");
      }

      return {
        sessionId: response.id as string,
        url: response.invoiceUrl as string,
      };
    } catch (error: unknown) {
      // SDK errors may contain credentials, request bodies and customer details.
      this.logger.error('Payment invoice creation failed.');

      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }

      // Handle Xendit specific errors
      if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
        throw new InternalServerErrorException(
          "Xendit authentication failed. Please verify your API key."
        );
      }

      throw new InternalServerErrorException(
        "Xendit payment processing failed. Please try again later or contact support."
      );
    }
  }
}
