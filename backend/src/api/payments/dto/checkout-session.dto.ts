import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  ValidateIf,
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

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(1000000)
  @ApiProperty({ type: Number })
  amount!: number;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false })
  @MaxLength(500)
  @ApiPropertyOptional({ type: String })
  successUrl?: string;

  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true, require_tld: false })
  @MaxLength(500)
  @ApiPropertyOptional({ type: String })
  cancelUrl?: string;
}
