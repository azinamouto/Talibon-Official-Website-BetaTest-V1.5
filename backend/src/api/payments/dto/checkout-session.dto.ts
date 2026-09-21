import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  Max,
  MaxLength
} from "class-validator";

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @ApiProperty({ type: String })
  itemName!: string;

  @IsNumber()
  @Min(1)
  @Max(1000000)
  @ApiProperty({ type: Number })
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ type: String })
  successUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ type: String })
  cancelUrl?: string;
}
