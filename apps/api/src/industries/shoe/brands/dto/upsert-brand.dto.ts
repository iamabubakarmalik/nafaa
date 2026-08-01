import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class UpsertShoeBrandDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() logoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() websiteUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isPremium?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSportsBrand?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isLocal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() authorizedDealer?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() dealerCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyPolicy?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() returnPolicy?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
