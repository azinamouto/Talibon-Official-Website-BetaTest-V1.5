import { BadRequestException, HttpException, Inject, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../../supabase.service';
import { LoginDto, SignupDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  async signup(dto: SignupDto) {
    const { data, error } = await this.supabase.createAuthClient().auth.signUp({
      email: dto.email,
      password: dto.password,
      options: { data: { full_name: dto.full_name.trim() } },
    });
    if (error) {
      if (error.status === 429) throw new HttpException('Please retry registration later.', 429);
      if (error.status >= 500) throw new ServiceUnavailableException('Registration is temporarily unavailable.');
      // Never forward provider messages that may disclose account existence.
      throw new BadRequestException('Unable to register with the supplied details.');
    }
    return { success: true, data: {
      session: data.session,
      user: data.user,
      confirmation_required: !data.session,
    } };
  }

  async login(dto: LoginDto) {
    const { data, error } = await this.supabase.createAuthClient().auth.signInWithPassword(dto);
    if (error || !data.session) throw new UnauthorizedException('Invalid email or password.');
    return { success: true, data: { session: data.session, user: data.user } };
  }

  async refresh(refresh_token: string) {
    const { data, error } = await this.supabase.createAuthClient().auth.refreshSession({ refresh_token });
    if (error || !data.session) throw new UnauthorizedException('Invalid or expired refresh token.');
    return { success: true, data: { session: data.session, user: data.user } };
  }

  async logout(token: string) {
    // Revoke the current session without installing a user's session on the shared service client.
    const { error } = await this.supabase.getClient().auth.admin.signOut(token, 'local');
    if (error) throw new ServiceUnavailableException('Unable to sign out. Please retry.');
    return { success: true };
  }
}
