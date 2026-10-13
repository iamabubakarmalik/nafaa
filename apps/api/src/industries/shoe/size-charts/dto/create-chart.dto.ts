import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShoeCategoryType, ShoeGender } from '@prisma/client';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSizeChartDto {
  @ApiProperty() @IsString() name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional({ enum: ShoeGender }) @IsOptional() @IsEnum(ShoeGender) gender?: ShoeGender;
  @ApiPropertyOptional({ enum: ShoeCategoryType }) @IsOptional() @IsEnum(ShoeCategoryType) categoryType?: ShoeCategoryType;
  // Size conversions, e.g. [{ uk: '8', us: '9', eu: '42', cm: '27' }]
  // Plain objects: without @Type the global implicit conversion turns each
  // element into an empty array and the rows are saved as [].
  @ApiProperty() @IsArray() @Type(() => Object) mappings!: any[];
  @ApiPropertyOptional() @IsOptional() @IsString() notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
