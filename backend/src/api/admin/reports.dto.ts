import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsISO8601, IsInt, IsOptional, IsUUID, Matches, Max, Min } from 'class-validator';

export class ReportQueryDto {
  @ApiProperty({ example: '2026-09-01T00:00:00Z', description: 'Inclusive UTC timestamp (timezone required)' })
  @IsISO8601({ strict: true }) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) from: string;
  @ApiProperty({ example: '2026-10-01T00:00:00Z', description: 'Exclusive timestamp; maximum interval 366 days' })
  @IsISO8601({ strict: true }) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) to: string;
  @ApiPropertyOptional({ default: 100, maximum: 500 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(500) limit = 100;
  @ApiPropertyOptional({ description: 'Use nextCursor.before with nextCursor.beforeId' })
  @IsOptional() @IsISO8601({ strict: true }) @Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/) before?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() beforeId?: string;
}
