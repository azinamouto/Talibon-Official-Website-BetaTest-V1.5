import { StaffRequest, contentMutation } from './staff-request';
import { Req, Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../security/auth.guard';
import { ContentService, CONTENT_ROLES } from './content.service';
import { CreateNewsDto, UpdateNewsDto, ListContentDto, ContentVersionDto } from './content.dto';
import { ContentResponse, ContentErrors } from './content.openapi';

@ApiTags('news')
@ContentErrors()
@Controller('api/news')
export class NewsContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Public()
  @Get()
  @ContentResponse('news', 'list')
  list(@Query() query: ListContentDto) { return this.content.list('news', query); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Get('manage')
  @ContentResponse('news', 'list')
  manage(@Req() req: StaffRequest, @Query() query: ListContentDto) { return this.content.list('news', query, req.staff); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Get('manage/:id')
  @ContentResponse('news', 'read')
  preview(@Req() req: StaffRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('news', id, req.staff); }

  @Public()
  @Get(':id')
  @ContentResponse('news', 'read')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('news', id); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Post()
  @ContentResponse('news', 'create')
  create(@Req() req: StaffRequest, @Body() body: CreateNewsDto) { contentMutation(req); return this.content.create('news', body, req.staff, req.requestId); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Patch(':id')
  @ContentResponse('news', 'read')
  update(@Req() req: StaffRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateNewsDto) {
    contentMutation(req); return this.content.update('news', id, body, req.staff, req.requestId);
  }

  @ApiCookieAuth('staffCookie')
  @Roles('admin')
  @Delete(':id')
  @HttpCode(204)
  @ContentResponse('news', 'delete')
  remove(@Req() req: StaffRequest, @Body() body: ContentVersionDto, @Param('id', new ParseUUIDPipe()) id: string) { contentMutation(req); return this.content.remove('news', id, body.version, req.staff, req.requestId); }
}

