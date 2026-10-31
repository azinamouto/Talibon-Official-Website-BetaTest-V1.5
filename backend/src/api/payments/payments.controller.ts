import { Public } from "../../security/auth.guard";
import { Controller, Post, Body, ServiceUnavailableException } from "@nestjs/common";
import { CreateCheckoutSessionDto } from "./dto/checkout-session.dto";
import { RateLimit, RateLimitCategory } from "../../security/rate-limiter.guard";

/**
 * Deprecated public checkout endpoint. Do not reinstate without trusted,
 * submission-linked fee assessment and authenticated, idempotent webhooks.
 * In particular, client-supplied amounts are NEVER authoritative fees.
 */
@Controller("api/payments")
export class PaymentsController {
  @Public()
  @Post("create-checkout-session")
  @RateLimit(RateLimitCategory.PAYMENT)
  createCheckoutSession(@Body() _dto: CreateCheckoutSessionDto): never {
    throw new ServiceUnavailableException(
      "Online payment is unavailable pending municipal fee and settlement verification."
    );
  }
}
