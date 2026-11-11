import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@nafaa.pk' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'NafaaAdmin@2026' })
  @IsString()
  @MinLength(8)
  password!: string;

  /** Six-digit code from the authenticator app, or a backup code, when two-step sign-in is on. */
  @ApiProperty({ required: false, example: '123456' })
  @IsOptional()
  @IsString()
  code?: string;
}
