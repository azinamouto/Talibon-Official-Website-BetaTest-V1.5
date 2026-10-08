import { BadRequestException, ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase.service';
import { ListContentDto } from './content.dto';

export const CONTENT = {
  pages: { table: 'pages', title: 'title', visible: 'published', fields: 'id,title,slug,content,status,created_at,updated_at' },
  news: { table: 'news', title: 'title', visible: 'published', fields: 'id,title,slug,summary,content,category,date,image_url,file_url,author,status,created_at,updated_at' },
  services: { table: 'services_cms', title: 'name', visible: 'available', fields: 'id,name,slug,description,purpose,requirements,processing_time,fees,office_responsible,office_hours,contact_info,physical_address,status,downloadable_forms,created_at,updated_at' },
} as const;
export type ContentKind = keyof typeof CONTENT;
export { CONTENT_ROLES } from '../../security/permissions';

@Injectable()
export class ContentService {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  private check(error: { code?: string } | null) {
    if (!error) return;
    if (error.code === '23505') throw new ConflictException('Slug already exists.');
    if (['23503', '23514', '23502', '22P02'].includes(error.code)) throw new BadRequestException('Invalid content or referenced department.');
    throw new InternalServerErrorException('Content storage is unavailable.');
  }

  async list(kind: ContentKind, query: ListContentDto, staff = false) {
    const config = CONTENT[kind];
    if (query.category && kind !== 'news') throw new BadRequestException('category is only supported for news.');
    if (query.office_responsible && kind !== 'services') throw new BadRequestException('office_responsible is only supported for services.');
    let request = this.supabase.getClient().from(config.table).select(config.fields, { count: 'exact' }).is('deleted_at', null);
    if (!staff) request = request.eq('status', config.visible);
    if (query.slug) request = request.eq('slug', query.slug);
    if (query.category) request = request.eq('category', query.category);
    if (query.office_responsible) request = request.eq('office_responsible', query.office_responsible);
    if (query.q) request = request.ilike(config.title, `%${query.q.replace(/[\\%_]/g, '\\$&')}%`);
    const { data, count, error } = await request.order('created_at', { ascending: false }).order('id', { ascending: false })
      .range((query.page - 1) * query.limit, query.page * query.limit - 1).returns<Record<string, unknown>[]>();
    this.check(error);
    return { data: data ?? [], pagination: { page: query.page, limit: query.limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / query.limit) } };
  }

  async get(kind: ContentKind, id: string, staff = false) {
    const config = CONTENT[kind];
    let request = this.supabase.getClient().from(config.table).select(config.fields).eq('id', id).is('deleted_at', null);
    if (!staff) request = request.eq('status', config.visible);
    const { data, error } = await request.maybeSingle();
    this.check(error);
    if (!data) throw new NotFoundException('Content not found.');
    return { data };
  }

  async create(kind: ContentKind, body: object) {
    const config = CONTENT[kind];
    const { data, error } = await this.supabase.getClient().from(config.table)
      .insert({ status: kind === 'services' ? 'coming-soon' : 'draft', ...body }).select(config.fields).single();
    this.check(error);
    return { data };
  }

  async update(kind: ContentKind, id: string, body: object) {
    if (!Object.keys(body).length) throw new BadRequestException('Provide at least one field.');
    const config = CONTENT[kind];
    const { data, error } = await this.supabase.getClient().from(config.table).update(body)
      .eq('id', id).is('deleted_at', null).select(config.fields).maybeSingle();
    this.check(error);
    if (!data) throw new NotFoundException('Content not found.');
    return { data };
  }

  async remove(kind: ContentKind, id: string) {
    const { data, error } = await this.supabase.getClient().from(CONTENT[kind].table)
      .update({ deleted_at: new Date().toISOString() }).eq('id', id).is('deleted_at', null).select('id').maybeSingle();
    this.check(error);
    if (!data) throw new NotFoundException('Content not found.');
  }
}
