import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ShoeCategoryType, ShoeGender } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSizeChartDto {
  @ApiProperty() @IsString() @MinLength(2, { message: 'Chart ka naam likhein' }) @MaxLength(60) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() brandId?: string;
  @ApiPropertyOptional({ enum: ShoeGender }) @IsOptional() @IsEnum(ShoeGender) gender?: ShoeGender;
  @ApiPropertyOptional({ enum: ShoeCategoryType }) @IsOptional() @IsEnum(ShoeCategoryType) categoryType?: ShoeCategoryType;
  // Size conversions, e.g. [{ uk: '8', us: '9', eu: '42', cm: '27' }]
  // Plain objects: without @Type the global implicit conversion turns each
  // element into an empty array and the rows are saved as [].
  @ApiProperty() @IsArray() @ArrayMinSize(1, { message: 'Kam az kam ek size likhein' }) @ArrayMaxSize(60) @Type(() => Object) mappings!: Array<Record<string, string>>;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSizeChartDto extends PartialType(CreateSizeChartDto) {}
