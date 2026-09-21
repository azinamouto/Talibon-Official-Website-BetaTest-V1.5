import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../../security/auth.guard';
import { RateLimit, RateLimitCategory } from '../../security/rate-limiter.guard';
import { SearchQueryDto, SearchResponseDto } from './search.dto';
import { SearchService } from './search.service';

@ApiTags('Search')
@Controller('api/search')
export class SearchController {
  constructor(@Inject(SearchService) private readonly searchService: SearchService) {}

  @Public()
  @RateLimit(RateLimitCategory.PUBLIC_READ)
  @Get()
  @ApiOperation({ summary: 'Full-text discovery across municipal news, services, and content pages with facets' })
  @ApiOkResponse({ type: SearchResponseDto, description: 'Matched items with relevance ranking, facets, and pagination metadata' })
  @ApiBadRequestResponse({ description: 'Invalid query parameters or query string constraint violation' })
  @ApiServiceUnavailableResponse({ description: 'Search storage unavailable' })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query);
  }
}

