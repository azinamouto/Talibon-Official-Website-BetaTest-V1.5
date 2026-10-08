import { supabase } from '../lib/supabase';
import type { SubmissionPayload } from '../components/eservices/formSchema';

export interface Submission extends SubmissionPayload {
  id: string; ticketId: string; status: string; version: number; submittedAt: string; updatedAt: string;
  history?: { id: string; status: string; remarks: string | null; createdAt: string }[];
}
export interface SubmissionList { data: Submission[]; pagination: { page: number; limit: number; total: number } }
export class SubmissionApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function citizenRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new SubmissionApiError(401, 'Please sign in again to continue. Your draft stays here while this page is open.');
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, { ...init, signal: init.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000), headers: {
      'Content-Type': 'application/json', 'X-API-Version': '1', Authorization: `Bearer ${data.session.access_token}`,
    } });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new SubmissionApiError(0, init.method === 'POST'
      ? 'The response was interrupted. Check My submissions before submitting again to avoid a duplicate.'
      : 'Unable to connect. Check your connection and try again.');
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'The request was rejected. Check your details and barangay, then try again.',
      401: 'Your session has expired. Please sign in again.', 403: 'You do not have permission to access this request.',
      404: 'Submission not found in your account.', 409: 'This request has changed. Refresh its status before continuing.',
      429: 'Too many requests. Please wait a minute before trying again.',
    };
    throw new SubmissionApiError(response.status, messages[response.status] ?? 'The service is temporarily unavailable. Please try again later.');
  }
  try { return await response.json() as T; }
  catch { throw new SubmissionApiError(0, 'The server returned an unreadable response. Check My submissions before retrying.'); }
}
export const submissionService = {
  submit: (payload: SubmissionPayload) => citizenRequest<Submission>('forms/submissions', { method: 'POST', body: JSON.stringify(payload) }),
  list: (page = 1, signal?: AbortSignal) => citizenRequest<SubmissionList>(`forms/submissions?page=${page}&limit=10`, { signal }),
  get: async (ticket: string, signal?: AbortSignal) => (await citizenRequest<{ success: boolean; request: Submission }>(`forms/submissions/${encodeURIComponent(ticket.trim())}`, { signal })).request,
};
