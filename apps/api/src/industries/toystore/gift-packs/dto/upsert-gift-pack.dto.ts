import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ToyAgeGroup, ToyGenderTarget } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertGiftPackDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;

  @ApiPropertyOptional({ enum: ToyAgeGroup }) @IsOptional() @IsEnum(ToyAgeGroup) targetAgeGroup?: ToyAgeGroup;
  @ApiPropertyOptional({ enum: ToyGenderTarget }) @IsOptional() @IsEnum(ToyGenderTarget) targetGender?: ToyGenderTarget;
  @ApiPropertyOptional() @IsOptional() @IsString() occasion?: string;

  @ApiProperty({ description: 'Array of { productId, quantity, unitPrice }' })
  @IsArray() items!: Array<{ productId: string; quantity: number; unitPrice: number }>;

  @ApiProperty() @IsNumber() giftPackPrice!: number;

  @ApiPropertyOptional() @IsOptional() @IsBoolean() isGiftWrapped?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() includesCard?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFeatured?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSeasonal?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() seasonName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() validUntil?: string;
}
