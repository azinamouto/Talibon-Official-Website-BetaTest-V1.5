import { StaffRequest, contentMutation } from './staff-request';
import { Req, Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../security/auth.guard';
import { ContentService, CONTENT_ROLES } from './content.service';
import { CreatePageDto, UpdatePageDto, ListContentDto, ContentVersionDto } from './content.dto';
import { ContentResponse, ContentErrors } from './content.openapi';

@ApiTags('pages')
@ContentErrors()
@Controller('api/pages')
export class PageContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Public()
  @Get()
  @ContentResponse('pages', 'list')
  list(@Query() query: ListContentDto) { return this.content.list('pages', query); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Get('manage')
  @ContentResponse('pages', 'list')
  manage(@Req() req: StaffRequest, @Query() query: ListContentDto) { return this.content.list('pages', query, req.staff); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Get('manage/:id')
  @ContentResponse('pages', 'read')
  preview(@Req() req: StaffRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('pages', id, req.staff); }

  @Public()
  @Get(':id')
  @ContentResponse('pages', 'read')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('pages', id); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Post()
  @ContentResponse('pages', 'create')
  create(@Req() req: StaffRequest, @Body() body: CreatePageDto) { contentMutation(req); return this.content.create('pages', body, req.staff, req.requestId); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Patch(':id')
  @ContentResponse('pages', 'read')
  update(@Req() req: StaffRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdatePageDto) {
    contentMutation(req); return this.content.update('pages', id, body, req.staff, req.requestId);
  }

  @ApiCookieAuth('staffCookie')
  @Roles('admin')
  @Delete(':id')
  @HttpCode(204)
  @ContentResponse('pages', 'delete')
  remove(@Req() req: StaffRequest, @Body() body: ContentVersionDto, @Param('id', new ParseUUIDPipe()) id: string) { contentMutation(req); return this.content.remove('pages', id, body.version, req.staff, req.requestId); }
}

