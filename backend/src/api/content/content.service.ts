import { BadRequestException, GoneException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
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
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  list(kind: ContentKind, query: ListContentDto, staff = false) {
    if (staff) throw new GoneException('Content administration is disabled.');
    if (query.category && kind !== 'news') throw new BadRequestException('category is only supported for news.');
    if (query.office_responsible && kind !== 'services') throw new BadRequestException('office_responsible is only supported for services.');
    return this.content.list(CONTENT[kind].table, query.page, query.limit, { slug: query.slug, q: query.q, category: query.category, office_responsible: query.office_responsible });
  }
  async get(kind: ContentKind, id: string, staff = false) {
    if (staff) throw new GoneException('Content administration is disabled.');
    const result = await this.content.list(CONTENT[kind].table, 1, 1, { id });
    if (!result.data.length) throw new NotFoundException('Content not found.');
    return { data: result.data[0] };
  }
  create(_kind: ContentKind, _body: object) { throw new GoneException('Content administration is disabled.'); }
  update(_kind: ContentKind, _id: string, _body: object) { throw new GoneException('Content administration is disabled.'); }
  remove(_kind: ContentKind, _id: string) { throw new GoneException('Content administration is disabled.'); }
}
