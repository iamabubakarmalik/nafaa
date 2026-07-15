import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DietaryTag, SpiceLevel } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertMenuItemDto {
  @ApiProperty()
  @IsString()
  productId!: string;

  @ApiPropertyOptional() @IsOptional() @IsInt() prepTimeMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() cookingInstructions?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() chefSpecial?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() bestSeller?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isSpicy?: boolean;
  @ApiPropertyOptional({ enum: SpiceLevel }) @IsOptional() @IsEnum(SpiceLevel) spiceLevel?: SpiceLevel;
  @ApiPropertyOptional() @IsOptional() @IsInt() calories?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() servingSize?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() servesPeople?: number;
  @ApiPropertyOptional({ enum: DietaryTag, isArray: true }) @IsOptional() @IsArray() dietaryTags?: DietaryTag[];
  @ApiPropertyOptional() @IsOptional() @IsString() allergenInfo?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() displayOrder?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isAvailable?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() availableFrom?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() availableTo?: string;
  @ApiPropertyOptional({ type: [Number] }) @IsOptional() @IsArray() availableDays?: number[];
  @ApiPropertyOptional() @IsOptional() @IsString() imageUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() videoUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() highlightColor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tagLine?: string;
}
