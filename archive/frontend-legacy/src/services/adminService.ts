import { supabase } from '../lib/supabase';

export const roles = ['guest', 'citizen', 'staff', 'editor', 'department_admin', 'barangay_admin', 'municipal_admin', 'admin', 'super_admin'] as const;
export interface AdminIdentity { user: { id: string }; profile: { role: string }; permissions: string[] }
export interface AdminUser { id: string; full_name: string | null; email: string; role: string; deleted_at: string | null; is_verified: boolean; version: number }
export interface PageResult<T> { data: T[]; pagination: { page: number; totalPages: number; total: number } }
export type ContentKind = 'pages' | 'news' | 'services';
export interface ContentRecord { id: string; title?: string; name?: string; slug: string; content?: string; description?: string; summary?: string; category?: string; office_responsible?: string; status: string }
export interface ReportResult { data: Record<string, string | number | null>[]; nextCursor: { before: string; beforeId: string } | null }
export class AdminApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new AdminApiError(401, 'Your session has expired. Please sign in again.');
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, { ...init,
      signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000),
      headers: { 'Content-Type': 'application/json', 'X-API-Version': '1', Authorization: `Bearer ${data.session.access_token}` },
    });
  } catch (cause) {
    if (init.signal?.aborted) throw cause;
    throw new AdminApiError(0, init.method && init.method !== 'GET'
      ? 'The response was interrupted. Reload the list to check whether the change was saved before retrying.'
      : 'Unable to connect. Please try again.');
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'Check the entered values. Services must reference an existing department ID.',
      401: 'Your session has expired. Please sign in again.', 403: 'Access denied. Your permissions may have changed.',
      404: 'This record no longer exists. Reload the list.',
      409: 'This record changed or its slug already exists. Reload before retrying; your changes have not been applied.',
      429: 'Too many requests. Please wait before trying again.',
    };
    if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event('admin-access-invalidated'));
    throw new AdminApiError(response.status, messages[response.status] ?? 'The service is unavailable. Please try again later.');
  }
  return response.status === 204 ? undefined as T : response.json();
}
export const adminService = {
  identity: async (signal?: AbortSignal) => (await adminRequest<{ data: AdminIdentity }>('auth/me', { signal })).data,
  users: (params: URLSearchParams, signal?: AbortSignal) => adminRequest<PageResult<AdminUser>>(`admin/users?${params}`, { signal }),
  user: async (id: string) => (await adminRequest<{ data: AdminUser }>(`admin/users/${id}`)).data,
  assignRole: (user: AdminUser, role: string) => adminRequest(`admin/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ version: user.version, role }) }),
  deactivate: (user: AdminUser) => adminRequest(`admin/users/${user.id}/deactivate`, { method: 'POST', body: JSON.stringify({ version: user.version }) }),
  content: (kind: ContentKind, page: number, signal?: AbortSignal) => adminRequest<PageResult<ContentRecord>>(`${kind}/manage?page=${page}&limit=20`, { signal }),
  saveContent: (kind: ContentKind, id: string | undefined, body: object) => adminRequest(`${kind}${id ? `/${id}` : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify(body) }),
  deleteContent: (kind: ContentKind, id: string) => adminRequest<void>(`${kind}/${id}`, { method: 'DELETE' }),
  report: (kind: string, params: URLSearchParams, signal?: AbortSignal) => adminRequest<ReportResult>(`admin/reports/${kind}?${params}`, { signal }),
};
