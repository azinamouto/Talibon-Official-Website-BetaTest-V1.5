import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { Public } from '../../security/auth.guard';
import { PublicContentService } from '../../database/public-content.service';
import { ListContentDto } from './content.dto';

@Public()
@Controller('api/public-content')
export class PublicCatalogController {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  @Get(':kind')
  list(@Param('kind') kind: string, @Query() query: ListContentDto) {
    return this.content.list(kind, query.page, query.limit, { slug: query.slug, q: query.q, category: query.category, office_responsible: query.office_responsible });
  }
}
