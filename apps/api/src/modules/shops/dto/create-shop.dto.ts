import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShopType } from '@prisma/client';
import {
  IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength,
} from 'class-validator';

export class CreateShopDto {
  @ApiProperty({ example: 'Hassan Carpets' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({ example: 'Civil Lines, Gujranwala' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional({ example: '03001234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;

  @ApiPropertyOptional({ enum: ShopType, default: 'SHOP' })
  @IsOptional()
  @IsEnum(ShopType)
  type?: ShopType;

  // ─── Optional: Create Manager along with Shop ───────────────
  @ApiPropertyOptional({ description: 'If provided, creates Manager user with this shop' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  managerName?: string;

  @ApiPropertyOptional({ example: 'manager@hassancarpets.pk' })
  @IsOptional()
  @IsEmail()
  managerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  managerPhone?: string;

  @ApiPropertyOptional({ minLength: 8 })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  managerPassword?: string;
}
