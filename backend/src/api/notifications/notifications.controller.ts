import { Controller, Inject, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequireAuth, Roles } from '../../security/auth.guard';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { EmailNotificationService } from './email-notification.service';
@ApiTags('Notifications') @ApiBearerAuth() @RequireAuth()
@Roles('admin','super_admin','municipal_admin')
@Controller('api/notifications')
export class NotificationsController {
  constructor(@Inject(EmailNotificationService) private readonly email: EmailNotificationService) {}
  @Post('process') @RateLimit(RateLimitCategory.ADMIN_MUTATION)
  process() { return this.email.processPending(1); }
}
