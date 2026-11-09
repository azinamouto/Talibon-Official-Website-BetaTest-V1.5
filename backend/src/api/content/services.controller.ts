import { StaffRequest, contentMutation } from './staff-request';
import { Req, Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../security/auth.guard';
import { ContentService, CONTENT_ROLES } from './content.service';
import { CreateServiceDto, UpdateServiceDto, ListContentDto, ContentVersionDto } from './content.dto';
import { ContentResponse, ContentErrors } from './content.openapi';

@ApiTags('services')
@ContentErrors()
@Controller('api/services')
export class ServiceContentController {
  constructor(@Inject(ContentService) private readonly content: ContentService) {}

  @Public()
  @Get()
  @ContentResponse('services', 'list')
  list(@Query() query: ListContentDto) { return this.content.list('services', query); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Get('manage')
  @ContentResponse('services', 'list')
  manage(@Req() req: StaffRequest, @Query() query: ListContentDto) { return this.content.list('services', query, req.staff); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Get('manage/:id')
  @ContentResponse('services', 'read')
  preview(@Req() req: StaffRequest, @Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('services', id, req.staff); }

  @Public()
  @Get(':id')
  @ContentResponse('services', 'read')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('services', id); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Post()
  @ContentResponse('services', 'create')
  create(@Req() req: StaffRequest, @Body() body: CreateServiceDto) { contentMutation(req); return this.content.create('services', body, req.staff, req.requestId); }

  @Roles(...CONTENT_ROLES)
  @ApiCookieAuth('staffCookie')
  @Patch(':id')
  @ContentResponse('services', 'read')
  update(@Req() req: StaffRequest, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateServiceDto) {
    contentMutation(req); return this.content.update('services', id, body, req.staff, req.requestId);
  }

  @ApiCookieAuth('staffCookie')
  @Roles('admin')
  @Delete(':id')
  @HttpCode(204)
  @ContentResponse('services', 'delete')
  remove(@Req() req: StaffRequest, @Body() body: ContentVersionDto, @Param('id', new ParseUUIDPipe()) id: string) { contentMutation(req); return this.content.remove('services', id, body.version, req.staff, req.requestId); }
}

