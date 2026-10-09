import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiExtraModels, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags, ApiTooManyRequestsResponse, getSchemaPath } from '@nestjs/swagger';
import { Public } from '../../security/auth.guard';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { SearchQueryDto, SearchResponseDto } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@ApiExtraModels(SearchResponseDto)
@Controller('api/search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Public()
  @RateLimit(RateLimitCategory.PUBLIC_READ)
  @Get()
  @ApiOperation({ summary: 'Full-text discovery across municipal news, services, and content pages with facets' })
  @ApiOkResponse({ description: 'Matched items with relevance ranking, query-wide facets, and filtered pagination metadata', schema: {
    allOf: [{ $ref: getSchemaPath(SearchResponseDto) }],
    example: {
      data: [{ id: '11111111-1111-4111-8111-111111111111', type: 'services', title: 'Municipal information', slug: 'municipal-information', snippet: 'Service details.', category: 'mayor', created_at: '2026-09-21T00:00:00.000Z', score: 1 }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      facets: { byType: { news: 0, services: 1, pages: 0 }, byCategory: { mayor: 1 } },
    },
  } })
  @ApiBadRequestResponse({ description: 'Invalid query parameters or query string constraint violation' })
  @ApiServiceUnavailableResponse({ description: 'Search storage unavailable' })
  @ApiTooManyRequestsResponse({ description: 'Public read rate limit exceeded; retry after the Retry-After header delay' })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }
}
