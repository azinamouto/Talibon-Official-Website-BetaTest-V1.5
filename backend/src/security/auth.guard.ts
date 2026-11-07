import { SetMetadata } from '@nestjs/common';
export { StaffGuard as AuthGuard } from '../authentication/staff.guard';
export const IS_PUBLIC_KEY = "isPublic";
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const REQUIRE_AUTH_KEY = "requireAuth";
export const RequireAuth = () => SetMetadata(REQUIRE_AUTH_KEY, true);
