import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PublicContentService } from '../../database/public-content.service';
import { ListContentDto } from './content.dto';
import { ContentInput, ContentRepository } from '../../database/content.repository';
import { StaffPrincipal } from '../../authentication/authentication.adapter';
import { runtimeConnectionConfig, PostgresDatabase, DatabaseError } from '../../database/postgres';
import { PUBLIC_KINDS } from '../../database/public-content.service';
import { ConflictException, ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
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
  private database: PostgresDatabase;
  private repository: ContentRepository;
  configure(repository: ContentRepository) { this.repository = repository; }
  private async run<T>(work: (repo: ContentRepository) => Promise<T>) {
    try {
      if (!this.repository) {
        this.database = new PostgresDatabase(runtimeConnectionConfig(process.env.DATABASE_URL));
        this.repository = new ContentRepository(this.database);
      }
      return await work(this.repository);
    } catch (error) {
      if (error instanceof DatabaseError) {
        if (error.code === 'forbidden') throw new ForbiddenException('Live staff MFA or fresh administrator MFA required.');
        if (error.code === 'conflict') throw new ConflictException('Content changed; refresh and retry.');
        if (error.code === 'invalid') throw new BadRequestException('Check content and approved source.');
      }
      throw new ServiceUnavailableException('Content operation could not be confirmed.');
    }
  }
  private kind(kind: string) {
    const table = CONTENT[kind as ContentKind]?.table ?? kind;
    if (!(PUBLIC_KINDS as readonly string[]).includes(table)) throw new BadRequestException('Unknown content kind.');
    return table;
  }
  manage(kind: string, query: ListContentDto, actor: StaffPrincipal, id?: string) {
    const table=this.kind(kind);
    return this.run(repo=>repo.list(actor,table,query.page,query.limit,id));
  }
  save(kind: string, input: Partial<ContentInput>, actor: StaffPrincipal, request: string, id?: string) {
    const table=this.kind(kind);
    return this.run(repo=>repo.save(actor,table,input,request,id));
  }
  async onModuleDestroy() { await this.database?.close(); }
  private legacyView(row: Record<string, any>, kind: ContentKind) {
    return { ...row.body, id:row.id,title:row.title,slug:row.slug,sourceId:row.source_id,
      status:kind==='services'?row.body.status:row.publication,publication:row.publication,
      version:row.version,updated_at:row.updated_at,created_at:row.published_at };
  }
  list(kind: ContentKind, query: ListContentDto, staff: StaffPrincipal | false = false) {
    if (staff) return this.manage(kind,query,staff).then(result=>({...result,data:result.data.map(row=>this.legacyView(row,kind))}));
    if (query.category && kind !== 'news') throw new BadRequestException('category is only supported for news.');
    if (query.office_responsible && kind !== 'services') throw new BadRequestException('office_responsible is only supported for services.');
    return this.content.list(CONTENT[kind].table, query.page, query.limit, { slug: query.slug, q: query.q, category: query.category, office_responsible: query.office_responsible });
  }
  async get(kind: ContentKind, id: string, staff: StaffPrincipal | false = false) {
    if (staff) { const result=await this.manage(kind,{page:1,limit:1},staff,id); if (!result.data.length) throw new NotFoundException(); return {data:this.legacyView(result.data[0],kind)}; }
    const result = await this.content.list(CONTENT[kind].table, 1, 1, { id });
    if (!result.data.length) throw new NotFoundException('Content not found.');
    return { data: result.data[0] };
  }
  create(kind: ContentKind, body: Record<string, any>, actor: StaffPrincipal, request: string) {
    const {sourceId,status,...fields}=body;
    return this.save(kind,{title:body.title ?? body.name,slug:body.slug,sourceId,body:kind==='services'?{...fields,status:status??'coming-soon'}:fields,status:kind==='services'?'draft':status},actor,request).then(result=>({data:this.legacyView(result.data,kind)}));
  }
  update(kind: ContentKind,id: string,body: Record<string, any>,actor: StaffPrincipal,request: string) {
    const {sourceId,status,version,...fields}=body;
    return this.save(kind,{title:body.title ?? body.name,slug:body.slug,sourceId,version,body:kind==='services'&&status?{...fields,status}:fields,status:kind==='services'?undefined:status},actor,request,id).then(result=>({data:this.legacyView(result.data,kind)}));
  }
  remove(kind: string,id: string,version: number,actor: StaffPrincipal,request: string) {
    const table=this.kind(kind);
    return this.run(repo=>repo.remove(actor,table,id,version,request));
  }
}
