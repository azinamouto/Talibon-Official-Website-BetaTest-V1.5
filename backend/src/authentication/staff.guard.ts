import { CanActivate, ExecutionContext, Injectable, Inject, UnauthorizedException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { staffAuthentication } from './runtime';

export type StaffRole = 'admin' | 'editor';
const STAFF_ROLES_KEY = 'roles';
const STAFF_PERMISSIONS_KEY = 'permissions';
const STAFF_AUTH_KEY = 'requireAuth';
const PUBLIC_KEY = 'isPublic';
const rolePermissions: Record<StaffRole, readonly string[]> = {
  admin: ['reports:read', 'users:read', 'users:update', 'users:deactivate', 'users:roles'],
  editor: ['media:read', 'media:write'],
};

export const StaffRoles = (...roles: StaffRole[]) => SetMetadata(STAFF_ROLES_KEY, roles);

@Injectable()
export class StaffGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    const publicRoute = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, targets);
    const roles = this.reflector.getAllAndOverride<string[]>(STAFF_ROLES_KEY, targets);
    const permissions = this.reflector.getAllAndOverride<string[]>(STAFF_PERMISSIONS_KEY, targets);
    const required = this.reflector.getAllAndOverride<boolean>(STAFF_AUTH_KEY, targets);
    if (publicRoute && !roles && !permissions && !required) return true;
    if (!roles?.length && !permissions?.length && !required) throw new ForbiddenException('Access denied.');
    const request = context.switchToHttp().getRequest();
    const actor = await staffAuthentication()?.verify(new Headers({ cookie: request.headers.cookie || '' }));
    if (!actor) throw new UnauthorizedException('Staff authentication and MFA required.');
    if (roles?.length && !roles.includes(actor.role)) throw new ForbiddenException('Access denied.');
    if (permissions?.length && !permissions.every(permission => rolePermissions[actor.role].includes(permission))) {
      throw new ForbiddenException('Access denied.');
    }
    request.staff = actor;
    return true;
  }
}
