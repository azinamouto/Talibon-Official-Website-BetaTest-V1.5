import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class SearchQueryDto {
  @ApiProperty({ description: 'Search term or query keywords (trimmed, 1-100 characters)', minLength: 1, maxLength: 100, example: 'business permit' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  q: string;

  @ApiPropertyOptional({ enum: ['all', 'news', 'services', 'pages'], default: 'all', description: 'Filter by content type' })
  @IsOptional()
  @IsIn(['all', 'news', 'services', 'pages'])
  type?: 'all' | 'news' | 'services' | 'pages' = 'all';

  @ApiPropertyOptional({ description: 'Exact category or responsible department; trimmed, empty means no filter', maxLength: 100, example: 'ANNOUNCEMENT' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50, description: 'Results per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;

  @ApiPropertyOptional({ enum: ['relevance', 'date'], default: 'relevance', description: 'Sort by relevance rank or creation date' })
  @IsOptional()
  @IsIn(['relevance', 'date'])
  sort?: 'relevance' | 'date' = 'relevance';
}

export class SearchItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' })
  id: string;

  @ApiProperty({ enum: ['news', 'services', 'pages'], example: 'services' })
  type: 'news' | 'services' | 'pages';

  @ApiProperty({ example: 'Business Permit Application & Renewal' })
  title: string;

  @ApiProperty({ example: 'business-permit' })
  slug: string;

  @ApiProperty({ example: 'Guidelines and online processing for new municipal business permits.' })
  snippet: string;

  @ApiProperty({ example: 'Business Permits & Licensing Office (BPLO)' })
  category: string;

  @ApiProperty({ example: '2026-09-01T12:00:00.000Z' })
  created_at: string;

  @ApiProperty({ example: 0.8542, description: 'Calculated PostgreSQL ts_rank_cd relevance score' })
  score: number;
}

export class SearchMetaDto {
  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}

export class SearchFacetsDto {
  @ApiProperty({
    example: { news: 15, services: 8, pages: 3 },
    type: 'object',
    properties: { news: { type: 'integer' }, services: { type: 'integer' }, pages: { type: 'integer' } },
    required: ['news', 'services', 'pages'],
    description: 'Query matches per type before type/category filters and pagination',
  })
  byType: {
    news: number;
    services: number;
    pages: number;
  };

  @ApiProperty({
    example: { 'ARTICLE': 10, 'ANNOUNCEMENT': 5, 'BPLO': 4 },
    type: 'object', additionalProperties: { type: 'integer' },
    description: 'Top 20 categories by query match count before type/category filters and pagination',
  })
  byCategory: Record<string, number>;
}

export class SearchResponseDto {
  @ApiProperty({ type: [SearchItemDto] })
  data: SearchItemDto[];

  @ApiProperty({ type: SearchMetaDto })
  meta: SearchMetaDto;

  @ApiProperty({ type: SearchFacetsDto })
  facets: SearchFacetsDto;
}
