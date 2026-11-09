import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { StaffRoles } from '../../authentication/staff.guard';
import { ContentService } from './content.service';
import { CmsContentDto, CmsUpdateDto, ContentVersionDto, ListContentDto } from './content.dto';
import { StaffRequest, contentMutation } from './staff-request';
@ApiTags('Information CMS') @ApiCookieAuth('staffCookie')
@StaffRoles('admin','editor')
@Controller('api/admin/content')
export class CmsContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}
  @Get(':kind') list(@Req() req: StaffRequest,@Param('kind') kind: string,@Query() query: ListContentDto) {
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
}
