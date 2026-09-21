import { Body, Controller, Get, HttpCode, Inject, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto } from './auth.dto';
import { Public } from '../../security/auth.guard';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import type { AuthenticatedRequest } from '../../security/authenticated-request';

@Controller('api/auth')
@RateLimit(RateLimitCategory.AUTHENTICATION)
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) { return this.auth.login(dto); }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshDto) { return this.auth.refresh(dto.refresh_token); }

  @Get('me')
  me(@Req() req: AuthenticatedRequest) {
    return { success: true, data: { user: { id: req.user.id, email: req.user.email }, profile: req.profile } };
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Req() req: AuthenticatedRequest) { return this.auth.logout(req.accessToken); }
}
