import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
  ServiceUnavailableException,
  Inject
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SupabaseService } from "../supabase.service";
import { AuthenticatedRequest } from './authenticated-request';

export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const REQUIRE_AUTH_KEY = "requireAuth";
export const RequireAuth = () => SetMetadata(REQUIRE_AUTH_KEY, true);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private reflector: Reflector,
    @Inject(SupabaseService) private supabaseService: SupabaseService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const requireAuth = this.reflector.getAllAndOverride<boolean>(REQUIRE_AUTH_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    // If public and no specific roles or requireAuth needed, pass
    if (isPublic && !requiredRoles && !requireAuth) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<AuthenticatedRequest>();
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Authorization header missing or invalid format.");
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException("Bearer token missing.");
    }

    try {
      const client = this.supabaseService.getClient();
      const { data, error } = await client.auth.getUser(token);

      if (error || !data.user) {
        throw new UnauthorizedException("Invalid or expired authentication token.");
      }

      // Decode only after Auth has verified the token. Session existence makes logout
      // effective immediately at this API, even while the access JWT is unexpired.
      let sessionId: string;
      try {
        sessionId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).session_id;
      } catch { throw new UnauthorizedException('Invalid session.'); }
      if (typeof sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionId)) {
        throw new UnauthorizedException('Invalid session.');
      }
      const { data: active, error: sessionError } = await client.rpc('is_api_session_active', {
        p_session_id: sessionId, p_user_id: data.user.id,
      });
      if (sessionError) throw new ServiceUnavailableException('Session verification is unavailable.');
      if (!active) throw new UnauthorizedException('Session has ended.');

      const { data: profile, error: profileError } = await client
        .from('profiles').select('role,is_verified,deleted_at').eq('id', data.user.id).maybeSingle();
      if (profileError) throw new ServiceUnavailableException('Authorization is unavailable.');
      if (!profile || profile.deleted_at) throw new ForbiddenException('Account is unavailable.');
      req.user = data.user;
      req.profile = profile;
      req.accessToken = token;

      // Role authorization check if roles specified
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRole = profile.is_verified === true && requiredRoles.includes(profile.role);
        if (!hasRole) {
          throw new ForbiddenException("Access denied. Required administrative privileges are missing.");
        }
      }

      return true;
    } catch (err: unknown) {
      if (err instanceof ForbiddenException || err instanceof UnauthorizedException || err instanceof ServiceUnavailableException) {
        throw err;
      }
      throw new UnauthorizedException("Authentication token verification failed.");
    }
  }
}
