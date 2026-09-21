import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
  ArrayMaxSize
} from "class-validator";

export class UpdateStatusDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @ApiProperty({ type: String })
  status!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @ApiPropertyOptional({ type: String })
  remarks?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  notifyCitizen?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  notifyEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ type: Boolean })
  saveTimeline?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  requirements?: string[];
}
