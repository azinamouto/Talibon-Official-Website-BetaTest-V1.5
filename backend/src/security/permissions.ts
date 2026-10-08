import { SetMetadata } from '@nestjs/common';

export const ROLE_NAMES = ['guest', 'citizen', 'staff', 'editor', 'department_admin', 'barangay_admin', 'municipal_admin', 'admin', 'super_admin'] as const;
export const CONTENT_ROLES = ['super_admin', 'admin', 'municipal_admin', 'editor'];
/** UI hints only; every API request still runs the live authorization guard. */
export function clientPermissions(profile: { role: string; is_verified: boolean; deleted_at: string | null }): string[] {
  if (!profile.is_verified || profile.deleted_at) return [];
  return [...(Object.hasOwn(ROLE_PERMISSIONS, profile.role) ? ROLE_PERMISSIONS[profile.role] : []),
    ...(CONTENT_ROLES.includes(profile.role) ? ['content:manage'] : [])];
}
export type Permission = 'reports:read' | 'users:read' | 'users:update' | 'users:deactivate' | 'users:roles';
const adminPermissions: readonly Permission[] = ['reports:read', 'users:read', 'users:update', 'users:deactivate'];
export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  guest: [], citizen: [], staff: [], editor: [], department_admin: [], barangay_admin: [],
  municipal_admin: adminPermissions, admin: adminPermissions,
  super_admin: [...adminPermissions, 'users:roles'],
};
export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (...permissions: Permission[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export function hasPermissions(role: string, permissions: Permission[]): boolean {
  return Object.hasOwn(ROLE_PERMISSIONS, role) && permissions.every(permission => ROLE_PERMISSIONS[role].includes(permission));
}
