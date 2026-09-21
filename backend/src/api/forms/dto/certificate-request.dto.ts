import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MaxLength,
  ArrayMaxSize
} from "class-validator";

export class CreateCertificateRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ type: String })
  documentType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ type: String })
  barangay!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ type: String })
  fullName!: string;

  @IsEmail()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ type: String })
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @ApiProperty({ type: String })
  mobileNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  @ApiProperty({ type: String })
  purpose!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @ApiPropertyOptional({ type: [String] })
  attachments?: string[];
}
