import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../security/auth.guard';
import { ContentService, CONTENT_ROLES } from './content.service';
import { CreateNewsDto, UpdateNewsDto, ListContentDto } from './content.dto';
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
  @ApiBearerAuth()
  @Get('manage')
  @ContentResponse('news', 'list')
  manage(@Query() query: ListContentDto) { return this.content.list('news', query, true); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Get('manage/:id')
  @ContentResponse('news', 'read')
  preview(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('news', id, true); }

  @Public()
  @Get(':id')
  @ContentResponse('news', 'read')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('news', id); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Post()
  @ContentResponse('news', 'create')
  create(@Body() body: CreateNewsDto) { return this.content.create('news', body); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Patch(':id')
  @ContentResponse('news', 'read')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateNewsDto) {
    return this.content.update('news', id, body);
  }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(204)
  @ContentResponse('news', 'delete')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.remove('news', id); }
}

