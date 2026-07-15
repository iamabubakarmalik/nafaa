import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartCategory, PartCondition } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpsertPartProfileDto {
  @ApiProperty() @IsString() productId!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() partNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() oemNumber?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() alternateNumbers?: string[];
  @ApiPropertyOptional({ enum: PartCategory }) @IsOptional() @IsEnum(PartCategory) category?: PartCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() subCategory?: string;
  @ApiPropertyOptional({ enum: PartCondition }) @IsOptional() @IsEnum(PartCondition) condition?: PartCondition;
  @ApiPropertyOptional() @IsOptional() @IsString() brand?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() countryOfOrigin?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() manufacturer?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() weightGrams?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() dimensions?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() color?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() material?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyMonths?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() warrantyKm?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() warrantyNotes?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() installationMinutes?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() requiresSpecialTool?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() installationDifficulty?: string;
  @ApiPropertyOptional() @IsOptional() compatibility?: any;
  @ApiPropertyOptional() @IsOptional() @IsInt() minStockAlert?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isFastMoving?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isCritical?: boolean;
}
