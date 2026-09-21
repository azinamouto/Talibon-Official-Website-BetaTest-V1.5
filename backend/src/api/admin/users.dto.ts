import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ValidateIf } from 'class-validator';
import { ROLE_NAMES } from '../../security/permissions';

export class UserListDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @ApiPropertyOptional({ default: 20 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @ApiPropertyOptional({ enum: ROLE_NAMES }) @IsOptional() @IsIn(ROLE_NAMES) role?: string;
  @ApiPropertyOptional({ enum: ['active', 'inactive', 'all'], default: 'active' }) @IsOptional() @IsIn(['active','inactive','all']) status = 'active';
}
export class UserVersionDto {
  @ApiProperty({ minimum: 1, description: 'Current profile version; stale writes return 409' })
  @IsInt() @Min(1) @Max(2147483646) version: number;
}
export class UpdateUserDto extends UserVersionDto {
  @ApiPropertyOptional({ maxLength: 200 }) @ValidateIf((_o, value) => value !== undefined)
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value) @IsString() @Length(1,200) full_name?: string;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @Length(1,100) barangay_id?: string | null;
  @ApiPropertyOptional({ nullable: true }) @IsOptional() @IsString() @Length(1,100) department_id?: string | null;
  @ApiPropertyOptional() @ValidateIf((_o, value) => value !== undefined) @IsBoolean() is_verified?: boolean;
}
export class AssignRoleDto extends UserVersionDto {
  @ApiProperty({ enum: ROLE_NAMES }) @IsIn(ROLE_NAMES) role: string;
}
export class AdminUserDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() email: string;
  @ApiProperty({ nullable: true }) full_name: string | null;
  @ApiProperty({ enum: ROLE_NAMES }) role: string;
  @ApiProperty() is_verified: boolean;
  @ApiProperty({ nullable: true }) barangay_id: string | null;
  @ApiProperty({ nullable: true }) department_id: string | null;
  @ApiProperty({ format: 'date-time' }) created_at: string;
  @ApiProperty({ format: 'date-time' }) updated_at: string;
  @ApiProperty({ nullable: true, format: 'date-time' }) deleted_at: string | null;
  @ApiProperty() version: number;
}
export class AdminUserResponseDto { @ApiProperty({ type: AdminUserDto }) data: AdminUserDto; }
export class UserPaginationDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() total: number;
  @ApiProperty() totalPages: number;
}
export class AdminUserListResponseDto {
  @ApiProperty({ type: [AdminUserDto] }) data: AdminUserDto[];
  @ApiProperty({ type: UserPaginationDto }) pagination: UserPaginationDto;
}
