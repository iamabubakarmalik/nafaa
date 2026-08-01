import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SportsBrandTier } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertSportsBrandDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() websiteUrl?: string;
  @ApiPropertyOptional({ enum: SportsBrandTier }) @IsOptional() @IsEnum(SportsBrandTier) brandTier?: SportsBrandTier;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() authorizedDealer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() dealerCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() supportPhone?: string;
  @ApiPropertyOptional() @IsOptional() @IsEmail() supportEmail?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyPolicy?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
