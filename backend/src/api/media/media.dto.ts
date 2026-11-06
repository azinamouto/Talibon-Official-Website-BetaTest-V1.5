import { IsIn, IsInt, IsString, IsUUID, MaxLength, Min, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MetadataDto {
  @ApiProperty() @IsString() @Matches(/\S/) @MaxLength(200) title: string;
  @ApiProperty() @IsString() @MaxLength(4000) description: string;
  @ApiProperty() @IsString() @MaxLength(500) altText: string;
  @ApiProperty() @IsUUID() categoryId: string;
}
export class UploadDto extends MetadataDto {
  @ApiProperty() @IsUUID() uploadId: string;
  @ApiProperty() @IsUUID() sourceId: string;
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
