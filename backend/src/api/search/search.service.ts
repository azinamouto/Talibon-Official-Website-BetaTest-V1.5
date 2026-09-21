import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../../supabase.service';
import { SearchQueryDto, SearchResponseDto } from './search.dto';

@Injectable()
export class SearchService {
  constructor(@Inject(SupabaseService) private readonly supabase: SupabaseService) {}

  async search(query: SearchQueryDto): Promise<SearchResponseDto> {
    const q = query.q?.trim();
    if (!q || q.length > 100) {
      throw new BadRequestException('Search query must be between 1 and 100 characters.');
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const offset = (page - 1) * limit;

    const { data, error } = await this.supabase.getClient().rpc('search_content', {
      p_query: q,
      p_type: query.type ?? 'all',
      p_category: query.category || null,
      p_limit: limit,
      p_offset: offset,
      p_sort: query.sort ?? 'relevance',
    });

    if (error) {
      throw new ServiceUnavailableException('Search index is temporarily unavailable.');
    }

    const payload = data as {
      data?: any[];
      total?: number;
      facets?: {
        byType?: { news: number; services: number; pages: number };
        byCategory?: Record<string, number>;
      };
    };

    const results = payload?.data ?? [];
    const total = payload?.total ?? 0;
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      data: results,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
      facets: {
        byType: payload?.facets?.byType ?? { news: 0, services: 0, pages: 0 },
        byCategory: payload?.facets?.byCategory ?? {},
      },
    };
  }
}
