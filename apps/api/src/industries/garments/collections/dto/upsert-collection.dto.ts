import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GarmentSeason } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertCollectionDto {
  @ApiProperty() @IsString() @MaxLength(80) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(30) code?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @ApiPropertyOptional({ enum: GarmentSeason }) @IsOptional() @IsEnum(GarmentSeason) season?: GarmentSeason;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(2000) @Max(2100) year?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() launchDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() endDate?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coverImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() bannerImageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) colorTheme?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() shopId?: string;
}

export class CollectionProductsDto {
  @ApiProperty({ type: [String] }) @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsString({ each: true }) productIds!: string[];
}

export class CollectionSaleDto {
  @ApiProperty() @IsBoolean() onSale!: boolean;
}
