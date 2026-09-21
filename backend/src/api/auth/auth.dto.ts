import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength, Matches } from 'class-validator';

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

export class SignupDto extends LoginDto {
  @MinLength(12)
  @ApiProperty({ type: String, minLength: 12, maxLength: 1024, format: 'password' })
  declare password: string;

  @IsString()
  @Matches(/\S/, { message: 'full_name must contain a non-whitespace character' })
  @MaxLength(100)
  @ApiProperty({ type: String, maxLength: 100 })
  full_name!: string;
}
