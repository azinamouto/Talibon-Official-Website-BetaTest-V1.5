import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { Body, Controller, Get, Post, Param, ParseUUIDPipe, Query, Req, Res, Inject, BadRequestException, ForbiddenException, SetMetadata } from '@nestjs/common';
import { ApiOkResponse, ApiQuery, ApiCookieAuth, ApiTags, ApiOperation, ApiProduces, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { StaffRoles } from '../../authentication/staff.guard';
import { StaffPrincipal } from '../../authentication/authentication.adapter';
import { MediaService } from './media.service';
import { EditDto, UploadDto, VersionDto } from './media.dto';
import { isStaffMutationOrigin } from '../../config/staff-origin';
import { CMS_VALIDATION_SCHEMA, invalidField } from '../../security/cms-validation';
type StaffRequest = Request & { staff: StaffPrincipal; requestId: string };
const STAFF_MEDIA_SCHEMA = { type: 'object' as const, required: ['id','kind','title','processing','publication','version','can_resume'], properties: {
  id: {type:'string' as const,format:'uuid'}, kind: {type:'string' as const,enum:['photo','document']}, title: {type:'string' as const},
  description: {type:'string' as const}, alt_text: {type:'string' as const}, category_id: {type:'string' as const,format:'uuid'}, source_id: {type:'string' as const,format:'uuid'},
  mime: {type:'string' as const}, bytes: {type:'integer' as const}, processing: {type:'string' as const,enum:['pending','ready']},
  publication: {type:'string' as const,enum:['draft','published']}, version: {type:'integer' as const}, original_filename: {type:'string' as const,nullable:true},
  can_resume: {type:'boolean' as const,description:'True only for a recoverable pending reservation created by the authenticated staff member.'},
  upload_id: {type:'string' as const,format:'uuid',description:'Present only when can_resume is true. Recovery must use the same original metadata and bytes.'},
} };
export function mediaMutation(req: Request) {
  if (!isStaffMutationOrigin(req.headers.origin, process.env) || !req.is('application/json')) throw new ForbiddenException('Same-origin JSON required.');
}
function headers(res: Response) { res.set({ 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' }); }
@ApiTags('Media CMS') @ApiCookieAuth('staffCookie') @StaffRoles('admin','editor')
@ApiResponse({status:400,description:'Invalid file, metadata or unapproved publication.',schema:CMS_VALIDATION_SCHEMA})
@ApiResponse({status:401,description:'Live staff session and MFA required.'})
@ApiResponse({status:403,description:'Role, same-origin JSON or fresh administrator MFA required.'})
@ApiResponse({status:404,description:'Ready accessible media not found.'})
@ApiResponse({status:409,description:'Version or upload identity conflict; refresh and retry.'})
@ApiResponse({status:429,description:'Upload attempt limit reached.'})
@ApiResponse({status:503,description:'Storage/database operation unconfirmed; safe retry allowed.'})
@Controller('api/admin/media')
export class MediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}
  @Get() @ApiOperation({ summary: 'List staff photo/document metadata, 50 per page' })
  @ApiQuery({ name: 'kind', required: false, enum: ['photo','document'] })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'ready', required: false, enum: ['true','false'] })
  @ApiQuery({ name: 'publication', required: false, enum: ['draft','published'] })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiOkResponse({schema:{type:'object',required:['data','hasMore'],properties:{data:{type:'array',items:STAFF_MEDIA_SCHEMA},hasMore:{type:'boolean'}}}})
  list(@Req() req: StaffRequest, @Query('page') page = '1', @Query('kind') kind = '', @Query('q') q = '', @Query('ready') ready = 'false', @Query('publication') publication = '', @Query('categoryId') categoryId = '') {
    if (typeof page !== 'string' || !/^[1-9]\d{0,3}$/.test(page)) invalidField('page','invalid');
    if (typeof kind !== 'string' || !['','photo','document'].includes(kind)) invalidField('kind','invalid');
    if (typeof q !== 'string' || q.length > 100 || /[\x00-\x1f]/.test(q)) invalidField('q','invalid');
    if (typeof ready !== 'string' || !['true','false'].includes(ready)) invalidField('request','invalid');
    if (typeof publication!=='string' || !['','draft','published'].includes(publication)) invalidField('request','invalid');
    if (typeof categoryId!=='string' || (categoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId))) invalidField('categoryId','uuid');
    return this.media.list(req.staff,Number(page),{kind,q,ready:ready === 'true',publication,categoryId});
  }
  @Get('options') options(@Req() req: StaffRequest) { return this.media.options(req.staff); }
  @Get(':id') @ApiOperation({ summary: 'Get ready private media metadata for a draft attachment' })
  @ApiOkResponse({schema:STAFF_MEDIA_SCHEMA})
  metadata(@Req() req: StaffRequest, @Param('id',ParseUUIDPipe) id: string) { return this.media.metadata(req.staff,id); }
  @Post('uploads') @ApiResponse({status:201,description:'Verified private draft. Uploading does not publish the file.',schema:STAFF_MEDIA_SCHEMA})
  upload(@Req() req: StaffRequest, @Body() body: UploadDto) { mediaMutation(req); return this.media.upload(req.staff,body,req.requestId); }
  @Post(':id/edit') edit(@Req() req: StaffRequest, @Param('id',ParseUUIDPipe) id: string, @Body() body: EditDto) { mediaMutation(req); return this.media.change(req.staff,id,body.version,'edit',body,req.requestId); }
  @Post(':id/publish') publish(@Req() req: StaffRequest, @Param('id',ParseUUIDPipe) id: string, @Body() body: VersionDto) { mediaMutation(req); return this.media.change(req.staff,id,body.version,'publish',{},req.requestId); }
  @Post(':id/unpublish') unpublish(@Req() req: StaffRequest, @Param('id',ParseUUIDPipe) id: string, @Body() body: VersionDto) { mediaMutation(req); return this.media.change(req.staff,id,body.version,'unpublish',{},req.requestId); }
  @Post(':id/delete') @StaffRoles('admin') remove(@Req() req: StaffRequest, @Param('id',ParseUUIDPipe) id: string, @Body() body: VersionDto) { mediaMutation(req); return this.media.change(req.staff,id,body.version,'delete',{},req.requestId); }
  @Get(':id/download') @ApiProduces('application/octet-stream')
  async download(@Req() req: StaffRequest, @Res() res: Response, @Param('id',ParseUUIDPipe) id: string) {
    const file = await this.media.download(id,req.staff); headers(res);
    res.set({ 'Content-Type': file.mime, 'Content-Disposition': `attachment; filename="${file.filename}"` }).send(file.bytes);
  }
  @Get(':id/preview') @ApiProduces('image/jpeg','image/png','image/webp','application/pdf')
  async preview(@Req() req: StaffRequest, @Res() res: Response, @Param('id',ParseUUIDPipe) id: string) {
    const file = await this.media.download(id,req.staff); headers(res);
    res.set({ 'Content-Type': file.mime, 'Content-Disposition': file.mime === 'application/pdf' ? 'attachment' : 'inline', 'Content-Security-Policy': "sandbox; default-src 'none'" }).send(file.bytes);
  }
}
@RateLimit(RateLimitCategory.PUBLIC_MEDIA)
@ApiTags('Published media') @SetMetadata('isPublic',true) @Controller('api/media')
@ApiResponse({status:404,description:'Approved published media not found.'})
@ApiResponse({status:503,description:'Storage unavailable or checksum verification failed.'})
export class PublicMediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}
  @Get() @ApiOperation({ summary: 'List approved published photos and documents, 50 per page' })
  @ApiQuery({ name: 'kind', required: false, enum: ['photo','document'] })
  @ApiQuery({ name: 'page', required: false, schema: { type: 'integer', minimum: 1, maximum: 9999, default: 1 } })
  @ApiOkResponse({ schema: { type: 'object', required: ['data','hasMore'], properties: {
    data: { type: 'array', items: { type: 'object', required: ['id','kind','title','download_url'], properties: {
      id: { type: 'string', format: 'uuid' }, kind: { type: 'string', enum: ['photo','document'] }, title: { type: 'string' },
      description: { type: 'string' }, alt_text: { type: 'string' }, mime: { type: 'string' }, bytes: { type: 'integer' },
      category: { type: 'string' }, published_at: { type: 'string', format: 'date-time' }, download_url: { type: 'string' },
    } } }, hasMore: { type: 'boolean' },
  }, example: { data: [], hasMore: false } } })
  list(@Query('kind') kind = '', @Query('page') page = '1') {
    if (!['','photo','document'].includes(kind) || !/^[1-9]\d{0,3}$/.test(page)) throw new BadRequestException();
    return this.media.listPublic(kind,Number(page));
  }
  @Get(':id/preview') @ApiProduces('image/jpeg','image/png','image/webp')
  async preview(@Res() res: Response, @Param('id',ParseUUIDPipe) id: string) {
    const file = await this.media.download(id);
    if (!['image/jpeg','image/png','image/webp'].includes(file.mime)) throw new BadRequestException('Photo preview only.');
    headers(res); res.set({ 'Content-Type': file.mime, 'Content-Disposition': 'inline', 'Content-Security-Policy': "sandbox; default-src 'none'" }).send(file.bytes);
  }
  @Get(':id/download') @ApiProduces('application/octet-stream')
  async download(@Res() res: Response, @Param('id',ParseUUIDPipe) id: string) {
    const file = await this.media.download(id); headers(res);
    res.set({ 'Content-Type': file.mime, 'Content-Disposition': `attachment; filename="${file.filename}"` }).send(file.bytes);
  }
}
