import { IsIn, IsInt, IsString, IsUUID, MaxLength, Min, Matches, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
const Optional = () => ValidateIf((_object, value) => value !== undefined);

export class MetadataDto {
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(200) title: string;
  @ApiProperty() @IsString() @MaxLength(4000) description: string;
  @ApiProperty() @IsString() @MaxLength(500) altText: string;
  @ApiPropertyOptional({ description: 'Defaults to Website photos or Website documents according to the verified file type.' }) @Optional() @IsUUID() categoryId?: string;
}
export class UploadDto extends MetadataDto {
  @ApiProperty() @IsUUID() uploadId: string;
  @ApiPropertyOptional({ description: 'Optional supporting evidence; new uploads stay private until authorized publication.' }) @Optional() @IsUUID() sourceId?: string;
  @ApiProperty() @IsString() @MaxLength(110) filename: string;
  @ApiProperty() @IsIn(['image/jpeg','image/png','image/webp','application/pdf']) mime: string;
  @ApiProperty({ description: 'Canonical base64; decoded file maximum 2 MiB.' }) @IsString() @MaxLength(2796204) base64: string;
}
export class VersionDto {
  @ApiProperty() @IsInt() @Min(1) version: number;
}
export class EditDto extends MetadataDto {
  @ApiProperty() @IsInt() @Min(1) version: number;
}
