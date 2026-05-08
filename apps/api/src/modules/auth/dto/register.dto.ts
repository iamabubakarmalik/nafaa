import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Ahmad Bakery' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  shopName!: string;

  @ApiProperty({ example: 'Ahmad Ali' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: 'ahmad@example.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, { message: 'Invalid phone number' })
  phone?: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @ApiPropertyOptional({ example: 'NAFAA-AHM3D7' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  referralCode?: string;
}
