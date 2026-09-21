import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../supabase.service';
import { ReportQueryDto } from './reports.dto';

export type ReportKind = 'submissions' | 'payments' | 'user-activity';
@Injectable()
export class ReportsService {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}
  async report(kind: ReportKind, query: ReportQueryDto) {
    const interval = Date.parse(query.to) - Date.parse(query.from);
    if (!Number.isFinite(interval) || interval <= 0 || interval > 366 * 86400000) {
      throw new BadRequestException('Date range must be positive and at most 366 days.');
    }
    if (Boolean(query.before) !== Boolean(query.beforeId)) throw new BadRequestException('Both cursor fields are required.');
    const { data, error } = await this.supabase.getClient().rpc('admin_report', {
      p_kind: kind, p_from: query.from, p_to: query.to, p_limit: query.limit,
      p_before: query.before ?? null, p_before_id: query.beforeId ?? null,
    });
    if (error) throw new ServiceUnavailableException('Report storage is unavailable.');
    const rows = (data ?? []) as Array<Record<string, unknown> & { id: string; created_at: string }>;
    const hasMore = rows.length > query.limit;
    const page = rows.slice(0, query.limit);
    const last = page.at(-1);
    return { data: page, nextCursor: hasMore && last ? { before: last.created_at, beforeId: last.id } : null };
  }
}
