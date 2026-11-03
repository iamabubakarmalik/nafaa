import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AppleSignInDto {
  @ApiProperty({ description: 'Identity token (JWT) from Sign in with Apple' })
  @IsString()
  @IsNotEmpty()
  identityToken!: string;

  @ApiPropertyOptional({ description: 'Raw nonce sent with the Apple request, if any' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nonce?: string;

  @ApiPropertyOptional({ description: 'Full name; Apple sends it only on the first sign-in' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ description: 'Email as reported by the device (informational; the token email is used)' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  email?: string;

  @ApiPropertyOptional({ description: 'Shop name (new users only)' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  shopName?: string;
}

export class CompleteAppleSignupDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  tempToken!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2, { message: 'Shop ka naam likhein' })
  @MaxLength(120)
  shopName!: string;
}
