import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  @ApiProperty({ type: String })
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  @ApiProperty({ type: String })
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  @ApiProperty({ type: String })
  refresh_token!: string;
}
