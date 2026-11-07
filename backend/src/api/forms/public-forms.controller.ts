import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOkResponse } from '@nestjs/swagger';
import { Public } from '../../security/auth.guard';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { PublicContentService } from '../../database/public-content.service';

const documentsResponse = ApiOkResponse({
  description: 'Published documents, or an empty list when none are published.',
  schema: { type: 'array', items: { type: 'object' }, example: [] },
});

@Public()
@RateLimit(RateLimitCategory.PUBLIC_READ)
@Controller(['api/forms', 'api/public-forms'])
export class PublicFormsController {
  constructor(@Inject(PublicContentService) private readonly content: PublicContentService) {}
  private async documents(category?: string) {
    const result = await this.content.list('downloadables',1,100,category ? { category } : {});
    return result.data.map(row => ({ ...row, url: row.file_url }));
  }
  @Get('business-permits') @documentsResponse getBusinessPermits() { return this.documents('business-permits'); }
  @Get('building-permits') @documentsResponse getBuildingPermits() { return this.documents('building-permits'); }
  @Get('zoning-clearance') @documentsResponse getZoningClearance() { return this.documents('zoning-clearance'); }
  @Get('downloadable') @documentsResponse getDownloadable() { return this.documents(); }
}
