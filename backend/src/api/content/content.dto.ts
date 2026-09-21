import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsString, Length, Matches, Max, Min, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// Unlike IsOptional, this does not let explicit null bypass validation.
const Optional = () => ValidateIf((_object, value) => value !== undefined);
export class ListContentDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 10000 })
  @Optional() @Type(() => Number) @IsInt() @Min(1) @Max(10000)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Optional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Case-insensitive literal title/name substring.' })
  @Optional() @IsString() @Length(1, 100)
  q?: string;

  @ApiPropertyOptional({ example: 'municipal-profile' })
  @Optional() @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) @Length(1, 160)
  slug?: string;

  @ApiPropertyOptional({ enum: ['ARTICLE', 'UPDATE', 'ANNOUNCEMENT'], description: 'News only.' })
  @Optional() @IsIn(['ARTICLE', 'UPDATE', 'ANNOUNCEMENT'])
  category?: string;

  @ApiPropertyOptional({ description: 'Services only; department ID.' })
  @Optional() @IsString() @Length(1, 100)
  office_responsible?: string;
}

export class CreatePageDto {
  @ApiProperty({ example: 'Municipal profile', maxLength: 200 })
  @IsString() @Length(1, 200) @Matches(/\S/)
  title: string;

  @ApiProperty({ example: 'municipal-profile', maxLength: 160 })
  @IsString() @Length(1, 160) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @ApiProperty({ example: 'Information about Talibon.', maxLength: 100000 })
  @IsString() @Length(1, 100000) @Matches(/\S/)
  content: string;

  @ApiPropertyOptional({ enum: ['draft', 'published', 'archived'], default: 'draft' })
  @Optional() @IsIn(['draft', 'published', 'archived'])
  status?: string;
}
export class UpdatePageDto extends PartialType(CreatePageDto, { skipNullProperties: false }) {}

export class CreateNewsDto extends CreatePageDto {
  @ApiProperty({ example: 'Latest municipal update.', maxLength: 2000 })
  @IsString() @Length(1, 2000) @Matches(/\S/)
  summary: string;

  @ApiPropertyOptional({ enum: ['ARTICLE', 'UPDATE', 'ANNOUNCEMENT'], default: 'ARTICLE' })
  @Optional() @IsIn(['ARTICLE', 'UPDATE', 'ANNOUNCEMENT'])
  category?: string;
}
export class UpdateNewsDto extends PartialType(CreateNewsDto, { skipNullProperties: false }) {}

export class CreateServiceDto {
  @ApiProperty({ example: 'Business permit', maxLength: 200 })
  @IsString() @Length(1, 200) @Matches(/\S/)
  name: string;

  @ApiProperty({ example: 'business-permit', maxLength: 160 })
  @IsString() @Length(1, 160) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @ApiProperty({ example: 'Apply for a business permit.', maxLength: 100000 })
  @IsString() @Length(1, 100000) @Matches(/\S/)
  description: string;

  @ApiProperty({ example: 'mayor', description: 'Existing department ID.' })
  @IsString() @Length(1, 100)
  office_responsible: string;

  @ApiPropertyOptional({ enum: ['available', 'coming-soon', 'maintenance'], default: 'coming-soon' })
  @Optional() @IsIn(['available', 'coming-soon', 'maintenance'])
  status?: string;

  @ApiPropertyOptional({ type: [String], example: ['Valid government ID'] })
  @Optional() @IsArray() @ArrayMaxSize(50) @IsString({ each: true }) @Length(1, 1000, { each: true })
  requirements?: string[];

  @ApiPropertyOptional({ example: '3 to 5 business days' })
  @Optional() @IsString() @Length(1, 500)
  processing_time?: string;

  @ApiPropertyOptional({ example: 'None' })
  @Optional() @IsString() @Length(1, 500)
  fees?: string;
}
export class UpdateServiceDto extends PartialType(CreateServiceDto, { skipNullProperties: false }) {}
