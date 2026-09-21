import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../../supabase.service';
import { CreateCertificateRequestDto } from './dto/certificate-request.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { ListSubmissionsDto } from './dto/list-submissions.dto';

interface RequestRow {
  id: string; ticket_id: string; user_id: string; document_type: string; barangay_id: string;
  full_name: string; email: string; mobile_number: string; purpose: string; attachments: string[];
  details: Record<string, unknown>; status: string; version: number; submitted_at: string; updated_at: string;
  workflow_history?: { id: string; status: string; remarks: string; created_at: string }[];
}
const columns = 'id,ticket_id,user_id,document_type,barangay_id,full_name,email,mobile_number,purpose,attachments,details,status,version,submitted_at,updated_at';
@Injectable()
export class FormsService {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  private check(error: { code?: string } | null) {
    if (!error) return;
    if (['23503', '23514', '22P02'].includes(error.code ?? '')) throw new BadRequestException('Invalid submission data or barangay.');
    if (error.code === '23505') throw new ConflictException('Submission already exists.');
    throw new ServiceUnavailableException('Submission storage is unavailable.');
  }
  private present(row: RequestRow) {
    return {
      id: row.id, ticketId: row.ticket_id, documentType: row.document_type, barangay: row.barangay_id,
      fullName: row.full_name, email: row.email, mobileNumber: row.mobile_number, purpose: row.purpose,
      attachments: row.attachments, details: row.details, status: row.status, version: row.version,
      submittedAt: row.submitted_at, updatedAt: row.updated_at,
      history: row.workflow_history?.map(h => ({ id: h.id, status: h.status, remarks: h.remarks, createdAt: h.created_at })),
    };
  }
  async submitRequest(dto: CreateCertificateRequestDto, user: { id: string; email?: string }) {
    if (!user.email || dto.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new BadRequestException('Use the email address of your signed-in account.');
    }
    const { data, error } = await this.supabase.getClient().from('certificate_requests').insert({
      ticket_id: `TAL-${randomUUID()}`, user_id: user.id, document_type: dto.documentType,
      barangay_id: dto.barangay, full_name: dto.fullName, email: user.email,
      mobile_number: dto.mobileNumber, purpose: dto.purpose, attachments: dto.attachments ?? [],
      details: dto.details, status: 'Submitted',
    }).select(columns).single();
    this.check(error);
    if (!data) throw new ServiceUnavailableException('Submission was not saved.');
    return this.present(data as RequestRow);
  }
  async list(query: ListSubmissionsDto, userId?: string) {
    let builder = this.supabase.getClient().from('certificate_requests').select(columns, { count: 'exact' }).is('deleted_at', null);
    if (userId) builder = builder.eq('user_id', userId);
    const { data, error, count } = await builder.order('submitted_at', { ascending: false }).order('id', { ascending: false })
      .range((query.page - 1) * query.limit, query.page * query.limit - 1);
    this.check(error);
    return { data: (data as RequestRow[] ?? []).map(row => this.present(row)), pagination: { page: query.page, limit: query.limit, total: count ?? 0 } };
  }
  // The administrative list is only exposed through a verified staff route.
  async getAllRequests(query = new ListSubmissionsDto()) { return this.list(query); }
  async getRequestStatus(code: string, userId?: string) {
    const field = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(code) ? 'id' : 'ticket_id';
    let query = this.supabase.getClient().from('certificate_requests')
      .select(`${columns},workflow_history(id,status,remarks,created_at)`).eq(field, code).is('deleted_at', null);
    if (userId) query = query.eq('user_id', userId);
    const { data, error } = await query.order('created_at', { referencedTable: 'workflow_history', ascending: true }).maybeSingle();
    this.check(error);
    if (!data) throw new NotFoundException('Submission not found.');
    return this.present(data as RequestRow);
  }
  async updateRequestStatus(id: string, dto: UpdateStatusDto, actorId: string) {
    const { data, error } = await this.supabase.getClient().from('certificate_requests')
      .update({ status: dto.status, status_remarks: dto.remarks ?? '', status_actor_id: actorId, version: dto.version + 1 })
      .eq('id', id).eq('version', dto.version).is('deleted_at', null).select(columns).maybeSingle();
    this.check(error);
    if (!data) {
      await this.getRequestStatus(id);
      throw new ConflictException('Submission changed. Refresh before updating its status.');
    }
    return { success: true, request: this.present(data as RequestRow) };
  }
  getBusinessPermits() { return [{ id: 1, title: 'Business Permit Application Form', url: '#' }, { id: 2, title: 'Business Permit Renewal Form', url: '#' }]; }
  getBuildingPermits() { return [{ id: 1, title: 'Building Permit Application Form', url: '#' }, { id: 2, title: 'Electrical Permit Form', url: '#' }, { id: 3, title: 'Plumbing Permit Form', url: '#' }]; }
  getZoningClearance() { return [{ id: 1, title: 'Zoning Clearance Application Form', url: '#' }]; }
  getDownloadable() { return [...this.getBusinessPermits(), ...this.getBuildingPermits(), ...this.getZoningClearance()]; }
}
