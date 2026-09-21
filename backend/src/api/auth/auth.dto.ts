import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  password!: string;
}

export class RefreshDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  refresh_token!: string;
}
