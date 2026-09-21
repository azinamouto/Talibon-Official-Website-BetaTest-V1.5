import { Body, Controller, Delete, Get, HttpCode, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../security/auth.guard';
import { ContentService, CONTENT_ROLES } from './content.service';
import { CreateServiceDto, UpdateServiceDto, ListContentDto } from './content.dto';
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
  @ApiBearerAuth()
  @Get('manage')
  @ContentResponse('services', 'list')
  manage(@Query() query: ListContentDto) { return this.content.list('services', query, true); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Get('manage/:id')
  @ContentResponse('services', 'read')
  preview(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('services', id, true); }

  @Public()
  @Get(':id')
  @ContentResponse('services', 'read')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.get('services', id); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Post()
  @ContentResponse('services', 'create')
  create(@Body() body: CreateServiceDto) { return this.content.create('services', body); }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Patch(':id')
  @ContentResponse('services', 'read')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateServiceDto) {
    return this.content.update('services', id, body);
  }

  @Roles(...CONTENT_ROLES)
  @ApiBearerAuth()
  @Delete(':id')
  @HttpCode(204)
  @ContentResponse('services', 'delete')
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.content.remove('services', id); }
}

