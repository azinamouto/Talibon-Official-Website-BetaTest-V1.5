import { SetMetadata } from '@nestjs/common';

export const ROLE_NAMES = ['guest', 'citizen', 'staff', 'editor', 'department_admin', 'barangay_admin', 'municipal_admin', 'admin', 'super_admin'] as const;
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
