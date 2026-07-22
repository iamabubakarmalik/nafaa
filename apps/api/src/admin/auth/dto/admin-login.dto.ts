import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@nafaa.pk' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'NafaaAdmin@2026' })
  @IsString()
  @MinLength(8)
  password!: string;
}
