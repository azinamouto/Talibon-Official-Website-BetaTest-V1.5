import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../security/auth.guard';
import { ContentService, CONTENT_ROLES } from './content.service';
import { CreatePageDto, UpdatePageDto, ListContentDto } from './content.dto';
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
  @ApiBearerAuth()
  @Get('manage')
  @ContentResponse('pages', 'list')
  manage(@Query() query: ListContentDto) { return this.content.list('pages', query, true); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Get('manage/:id')
  @ContentResponse('pages', 'read')
  preview(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('pages', id, true); }

  @Public()
  @Get(':id')
  @ContentResponse('pages', 'read')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('pages', id); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Post()
  @ContentResponse('pages', 'create')
  create(@Body() body: CreatePageDto) { return this.content.create('pages', body); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Patch(':id')
  @ContentResponse('pages', 'read')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdatePageDto) {
    return this.content.update('pages', id, body);
  }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(204)
  @ContentResponse('pages', 'delete')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.remove('pages', id); }
}

