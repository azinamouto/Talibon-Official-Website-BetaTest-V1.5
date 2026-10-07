import { Public } from "../../security/auth.guard";
import { Controller, Post, Body, Inject } from "@nestjs/common";
import { PaymentsService } from "./payments.service";
import { CreateCheckoutSessionDto } from "./dto/checkout-session.dto";
import { RateLimit, RateLimitCategory } from "../../security/rate-limiter.guard";

@Controller("api/payments")
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post("create-checkout-session")
  @RateLimit(RateLimitCategory.PAYMENT)
  async createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto
  ) {
    const { itemName, amount, successUrl, cancelUrl } = dto;

    return this.paymentsService.createCheckoutSession(itemName, amount, successUrl, cancelUrl);
  }
}
