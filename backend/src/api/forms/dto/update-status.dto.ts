import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export const REQUEST_STATUSES = ['Submitted', 'Assigned', 'Processing', 'Returned', 'Approved', 'Rejected', 'Completed', 'Archived'];
export class UpdateStatusDto {
  @ApiProperty({ enum: REQUEST_STATUSES }) @IsIn(REQUEST_STATUSES) status!: string;
  @ApiProperty({ description: 'Version returned by the last read; stale updates return 409.' })
  @IsInt() @Min(1) version!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) remarks?: string;
}
