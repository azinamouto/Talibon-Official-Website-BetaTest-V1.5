import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Header, Inject, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { StaffRoles } from '../../authentication/staff.guard';
import { ContentService } from './content.service';
import { CmsContentDto, CmsUpdateDto, CmsPublishUpdateDto, ContentPublishDto, ContentSourceDto, ContentVersionDto, ListContentDto } from './content.dto';
import { StaffRequest, contentMutation } from './staff-request';
import { ContentErrors } from './content.openapi';
@ApiTags('Information CMS') @ApiCookieAuth('staffCookie')
@StaffRoles('admin','editor')
@ContentErrors()
@Controller('api/admin/content')
export class CmsContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}
  @Get('dashboard') @Header('Cache-Control','private, no-store') dashboard(@Req() req: StaffRequest) { return this.content.dashboard(req.staff); }
  @Get('sources') @Header('Cache-Control','private, no-store') sources(@Req() req: StaffRequest) { return this.content.sources(req.staff); }
  @Post('sources') @StaffRoles('admin') createSource(@Req() req: StaffRequest,@Body() body: ContentSourceDto) {
    contentMutation(req); return this.content.createSource(body,req.staff,req.requestId);
  }
  @Post('sources/:id/approve') @StaffRoles('admin') approveSource(@Req() req: StaffRequest,@Param('id',ParseUUIDPipe) id: string) {
    contentMutation(req); return this.content.approveSource(id,req.staff,req.requestId);
  }
  @Get(':kind/:id/preview') @Header('Cache-Control','private, no-store')
  preview(@Req() req: StaffRequest,@Param('kind') kind: string,@Param('id',ParseUUIDPipe) id: string) {
    return this.content.manage(kind,{page:1,limit:1},req.staff,id);
  }
  @Get(':kind') @Header('Cache-Control','private, no-store') list(@Req() req: StaffRequest,@Param('kind') kind: string,@Query() query: ListContentDto) {
    return this.content.manage(kind,query,req.staff);
  }
  @Post(':kind') create(@Req() req: StaffRequest,@Param('kind') kind: string,@Body() body: CmsContentDto) {
    contentMutation(req); return this.content.save(kind,body,req.staff,req.requestId);
  }
  @Post(':kind/:id/edit') edit(@Req() req: StaffRequest,@Param('kind') kind: string,@Param('id',ParseUUIDPipe) id: string,@Body() body: CmsUpdateDto) {
    contentMutation(req); return this.content.save(kind,body,req.staff,req.requestId,id);
  }
  @Post(':kind/:id/delete') @StaffRoles('admin') remove(@Req() req: StaffRequest,@Param('kind') kind: string,@Param('id',ParseUUIDPipe) id: string,@Body() body: ContentVersionDto) {
    contentMutation(req); return this.content.remove(kind,id,body.version,req.staff,req.requestId);
  }
  @Post(':kind/:id/update') update(@Req() req: StaffRequest,@Param('kind') kind: string,@Param('id',ParseUUIDPipe) id: string,@Body() body: CmsPublishUpdateDto) {
    contentMutation(req);const {media,...input}=body;return this.content.updatePublished(kind,id,input,req.staff,req.requestId,media);
  }
  @Post(':kind/:id/publish') publish(@Req() req: StaffRequest,@Param('kind') kind: string,@Param('id',ParseUUIDPipe) id: string,@Body() body: ContentPublishDto) {
    contentMutation(req); return this.content.change(kind,id,body.version,'publish',req.staff,req.requestId,body.media);
  }
  @Post(':kind/:id/unpublish') unpublish(@Req() req: StaffRequest,@Param('kind') kind: string,@Param('id',ParseUUIDPipe) id: string,@Body() body: ContentVersionDto) {
    contentMutation(req); return this.content.change(kind,id,body.version,'unpublish',req.staff,req.requestId);
  }
  @Post(':kind/:id/archive') archive(@Req() req: StaffRequest,@Param('kind') kind: string,@Param('id',ParseUUIDPipe) id: string,@Body() body: ContentVersionDto) {
    contentMutation(req); return this.content.change(kind,id,body.version,'archive',req.staff,req.requestId);
  }
  @Post(':kind/:id/restore') restore(@Req() req: StaffRequest,@Param('kind') kind: string,@Param('id',ParseUUIDPipe) id: string,@Body() body: ContentVersionDto) {
    contentMutation(req); return this.content.change(kind,id,body.version,'restore',req.staff,req.requestId);
  }
}
