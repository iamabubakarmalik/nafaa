import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoeCategoryType, ShoeGender } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateSizeChartDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional({ enum: ShoeGender }) @IsOptional() @IsEnum(ShoeGender) gender?: ShoeGender;
  @ApiPropertyOptional({ enum: ShoeCategoryType }) @IsOptional() @IsEnum(ShoeCategoryType) categoryType?: ShoeCategoryType;
  @ApiProperty() mappings!: any;
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
